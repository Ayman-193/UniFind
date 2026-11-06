<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\ActivityLog;
use App\Models\Category;
use App\Models\Item;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;

class DashboardController extends Controller
{
    public function stats(): JsonResponse
    {
        $countWhere = fn (array $where) => Item::where($where)->count();

        $counters = [
            'total' => Item::count(),
            'open_lost' => $countWhere(['type' => 'lost', 'status' => 'open']),
            'open_found' => $countWhere(['type' => 'found', 'status' => 'open']),
            'matched' => $countWhere(['status' => 'found']),
            'returned' => $countWhere(['status' => 'returned']),
            'closed' => $countWhere(['status' => 'closed']),
            'removed' => Item::onlyTrashed()->count(),
            'students' => User::where('role', User::ROLE_STUDENT)->count(),
        ];

        $perCategory = Category::withCount('items')->orderByDesc('items_count')->orderBy('name')->get()
            ->map(fn (Category $c) => ['id' => $c->id, 'name' => $c->name, 'count' => $c->items_count]);

        // Items created per day for the last 14 days (today included), zero-filled.
        $start = Carbon::today()->subDays(13);
        $counts = Item::withTrashed()
            ->where('created_at', '>=', $start)
            ->get(['created_at'])
            ->groupBy(fn (Item $item) => $item->created_at->format('Y-m-d'))
            ->map->count();

        $perDay = collect(range(0, 13))->map(function (int $offset) use ($start, $counts) {
            $date = $start->copy()->addDays($offset)->format('Y-m-d');

            return ['date' => $date, 'count' => $counts->get($date, 0)];
        });

        $recent = ActivityLog::with('user')->latest('id')->limit(8)->get()->map->toApi();

        return response()->json([
            'counters' => $counters,
            'per_category' => $perCategory,
            'per_day' => $perDay,
            'recent_activity' => $recent,
        ]);
    }

    public function activity(Request $request): JsonResponse
    {
        $request->validate([
            'action' => ['nullable', 'string', 'max:60'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
        ]);

        $page = ActivityLog::with('user')
            ->when($request->filled('action'), fn ($q) => $q->where('action', $request->input('action')))
            ->latest('id')
            ->paginate((int) $request->input('per_page', 25))
            ->withQueryString();

        return response()->json([
            'data' => collect($page->items())->map->toApi(),
            'meta' => [
                'current_page' => $page->currentPage(),
                'last_page' => $page->lastPage(),
                'per_page' => $page->perPage(),
                'total' => $page->total(),
            ],
            'actions' => ActivityLog::query()->distinct()->orderBy('action')->pluck('action'),
        ]);
    }
}
