<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Role-aware item shape.
 *  - everyone:      public fields (title, description, category, location, date, status, photo)
 *  - owner + admin: contact info, admin note, matched item, edit permission
 *  - admin only:    reporter details, removal reason, deleted_at
 *
 * @mixin \App\Models\Item
 */
class ItemResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $viewer = $request->user();
        $isAdmin = (bool) $viewer?->isAdmin();
        $isOwner = $viewer && $viewer->id === $this->user_id;
        $private = $isAdmin || $isOwner;

        $data = [
            'id' => $this->id,
            'type' => $this->type,
            'title' => $this->title,
            'description' => $this->description,
            'category' => $this->whenLoaded('category', fn () => ['id' => $this->category->id, 'name' => $this->category->name]),
            'location' => $this->whenLoaded('location', fn () => ['id' => $this->location->id, 'name' => $this->location->name]),
            'category_id' => $this->category_id,
            'location_id' => $this->location_id,
            'date_reported' => $this->date_reported?->format('Y-m-d'),
            'status' => $this->status,
            'image_url' => $this->imageUrl(),
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
            'is_mine' => $isOwner,
            'can_edit' => $viewer ? $this->canBeEditedBy($viewer) : false,
        ];

        if ($private) {
            $data['contact_info'] = $this->contact_info;
            $data['admin_note'] = $this->admin_note;
            $data['matched_item_id'] = $this->matched_item_id;
            $data['matched_item'] = $this->matched_item_id && $this->relationLoaded('matchedItem') && $this->matchedItem
                ? [
                    'id' => $this->matchedItem->id,
                    'type' => $this->matchedItem->type,
                    'title' => $this->matchedItem->title,
                    'status' => $this->matchedItem->status,
                    'date_reported' => $this->matchedItem->date_reported?->format('Y-m-d'),
                    'location' => $this->matchedItem->location?->name,
                    'image_url' => $this->matchedItem->imageUrl(),
                ]
                : null;
        }

        if ($isAdmin) {
            $data['reporter'] = $this->whenLoaded('user', fn () => $this->user ? [
                'id' => $this->user->id,
                'name' => $this->user->name,
                'email' => $this->user->email,
                'role' => $this->user->role,
                'student_id' => $this->user->student_id,
                'phone' => $this->user->phone,
            ] : null);
            $data['delete_reason'] = $this->delete_reason;
            $data['deleted_at'] = $this->deleted_at?->toIso8601String();
        }

        return $data;
    }
}
