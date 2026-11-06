<?php

namespace Tests\Feature\Concerns;

use App\Models\Category;
use App\Models\Item;
use App\Models\Location;
use App\Models\User;

trait BuildsUniFindData
{
    protected User $admin;
    protected User $student;
    protected User $otherStudent;
    protected Category $category;
    protected Location $location;

    protected function buildBaseData(): void
    {
        $this->admin = User::factory()->admin()->create(['email' => 'admin@uqu.edu.sa', 'password' => 'Demo@12345']);
        $this->student = User::factory()->create(['email' => 'student@uqu.edu.sa', 'password' => 'Demo@12345']);
        $this->otherStudent = User::factory()->create();
        $this->category = Category::create(['name' => 'Electronics']);
        $this->location = Location::create(['name' => 'Main Library']);
    }

    protected function makeItem(User $owner, array $attributes = []): Item
    {
        return Item::create(array_merge([
            'user_id' => $owner->id,
            'category_id' => $this->category->id,
            'location_id' => $this->location->id,
            'type' => 'lost',
            'title' => 'Sample item',
            'description' => 'A sample description long enough.',
            'date_reported' => now()->toDateString(),
            'contact_info' => '050 000 0000',
            'status' => 'open',
        ], $attributes));
    }

    protected function itemPayload(array $overrides = []): array
    {
        return array_merge([
            'title' => 'Black umbrella',
            'description' => 'Folding black umbrella with a wooden handle.',
            'category_id' => $this->category->id,
            'location_id' => $this->location->id,
            'date_reported' => now()->toDateString(),
            'contact_info' => '050 123 4567',
        ], $overrides);
    }
}
