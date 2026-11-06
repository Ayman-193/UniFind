<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Resources\ItemResource;
use App\Models\ActivityLog;
use App\Models\Item;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class AdminItemController extends Controller
{
    private const WITH = ['category', 'location', 'user', 'matchedItem.location'];

    /**
     * Change an item's status, with an optional note for the reporter.
     * A lost item marked "found" can be linked to the FOUND item that matches it;
     * that found item is then reserved (status "found") so it leaves the public catalog.
     */
    public function updateStatus(Request $request, int $id): ItemResource
    {
        $item = Item::findOrFail($id);

        $data = $request->validate([
            'status' => ['required', Rule::in(Item::STATUSES)],
            'admin_note' => ['nullable', 'string', 'max:1000'],
            'matched_item_id' => ['nullable', 'integer'],
        ]);

        $matchId = $data['matched_item_id'] ?? null;
        $match = null;

        if ($matchId !== null) {
            if (! in_array($data['status'], ['found', 'returned'], true)) {
                throw ValidationException::withMessages(['matched_item_id' => 'Link a found item only when marking the request found or returned.']);
            }
            if ($item->type !== 'lost') {
                throw ValidationException::withMessages(['matched_item_id' => 'Only a lost request can be linked to a found item.']);
            }
            if ((int) $matchId === $item->id) {
                throw ValidationException::withMessages(['matched_item_id' => 'An item cannot be linked to itself.']);
            }
            $match = Item::find($matchId);
            if (! $match) {
                throw ValidationException::withMessages(['matched_item_id' => 'The selected found item does not exist.']);
            }
            if ($match->type !== 'found') {
                throw ValidationException::withMessages(['matched_item_id' => 'You can only link a FOUND item, not another lost request.']);
            }
            $linkedElsewhere = $match->matched_item_id && $match->matched_item_id !== $item->id;
            if ($linkedElsewhere || in_array($match->status, ['returned', 'closed'], true)) {
                throw ValidationException::withMessages(['matched_item_id' => 'This found item is already linked to another request or has been closed.']);
            }
        }

        $before = ['status' => $item->status, 'matched_item_id' => $item->matched_item_id];

        DB::transaction(function () use ($item, $data, $match, $request) {
            $previousMatch = $item->matched_item_id ? Item::find($item->matched_item_id) : null;
            $keepsLink = in_array($data['status'], ['found', 'returned'], true);

            $item->status = $data['status'];
            if ($request->has('admin_note')) {
                $item->admin_note = $data['admin_note'];
            }
            $item->matched_item_id = $keepsLink ? ($match?->id ?? $item->matched_item_id) : null;
            $item->save();

            // Release a found item that is no longer linked to this request.
            if ($previousMatch && $previousMatch->id !== $item->matched_item_id && $previousMatch->matched_item_id === $item->id) {
                $previousMatch->update(['matched_item_id' => null, 'status' => 'open']);
            }

            // The linked found item follows the request: reserved while "found", then "returned".
            if ($item->matched_item_id) {
                Item::whereKey($item->matched_item_id)->update([
                    'matched_item_id' => $item->id,
                    'status' => $item->status,
                    'updated_at' => now(),
                ]);
            }
        });

        ActivityLog::record('item.status_changed', $item, [
            'from' => $before['status'],
            'to' => $item->status,
            'matched_item_id' => $item->matched_item_id,
            'note' => $item->admin_note,
        ]);

        return new ItemResource($item->fresh(self::WITH));
    }

    public function destroy(Request $request, int $id): JsonResponse
    {
        $item = Item::findOrFail($id);

        $data = $request->validate([
            'reason' => ['required', 'string', 'min:3', 'max:255'],
        ], [
            'reason.required' => 'Give a reason for removing this item.',
        ]);

        $item->delete_reason = $data['reason'];
        $item->save();
        $item->delete();

        ActivityLog::record('item.removed', $item, ['reason' => $data['reason'], 'title' => $item->title]);

        return response()->json(['message' => 'Item removed.']);
    }

    public function restore(int $id): ItemResource
    {
        $item = Item::onlyTrashed()->findOrFail($id);
        $reason = $item->delete_reason;

        $item->restore();
        $item->update(['delete_reason' => null]);

        ActivityLog::record('item.restored', $item, ['previous_reason' => $reason]);

        return new ItemResource($item->fresh(self::WITH));
    }
}
