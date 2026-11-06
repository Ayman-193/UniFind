<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\Feature\Concerns\BuildsUniFindData;
use Tests\TestCase;

class AdminItemsTest extends TestCase
{
    use BuildsUniFindData, RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->buildBaseData();
        Sanctum::actingAs($this->admin);
    }

    public function test_admin_registers_a_found_item_and_sees_reporter_details(): void
    {
        $this->postJson('/api/items', $this->itemPayload())->assertCreated()->assertJsonPath('data.type', 'found');

        $lost = $this->makeItem($this->student);
        $this->getJson("/api/items/{$lost->id}")->assertOk()
            ->assertJsonPath('data.reporter.email', 'student@uqu.edu.sa');
    }

    public function test_admin_can_edit_any_item(): void
    {
        $item = $this->makeItem($this->student, ['status' => 'found']);

        $this->putJson("/api/items/{$item->id}", $this->itemPayload(['title' => 'Admin edit']))->assertOk();
        $this->assertDatabaseHas('items', ['id' => $item->id, 'title' => 'Admin edit']);
        $this->assertDatabaseHas('activity_logs', ['action' => 'item.updated', 'subject_id' => $item->id]);
    }

    public function test_admin_marks_request_found_with_note_and_match(): void
    {
        $lost = $this->makeItem($this->student);
        $found = $this->makeItem($this->admin, ['type' => 'found']);

        $this->patchJson("/api/admin/items/{$lost->id}/status", [
            'status' => 'found',
            'admin_note' => 'Collect it from Student Affairs.',
            'matched_item_id' => $found->id,
        ])->assertOk()
            ->assertJsonPath('data.status', 'found')
            ->assertJsonPath('data.matched_item.id', $found->id)
            ->assertJsonPath('data.matched_item.location', 'Main Library');

        // The found item is reserved and leaves the public catalog.
        $this->assertDatabaseHas('items', ['id' => $found->id, 'status' => 'found', 'matched_item_id' => $lost->id]);
        $this->assertDatabaseHas('activity_logs', ['action' => 'item.status_changed', 'subject_id' => $lost->id]);

        // The student sees the note and the match.
        Sanctum::actingAs($this->student);
        $this->getJson("/api/items/{$lost->id}")->assertOk()
            ->assertJsonPath('data.admin_note', 'Collect it from Student Affairs.')
            ->assertJsonPath('data.matched_item.title', $found->title);
        $this->assertSame([], $this->getJson('/api/items')->json('data'));

        // Returned propagates to the found item.
        Sanctum::actingAs($this->admin);
        $this->patchJson("/api/admin/items/{$lost->id}/status", ['status' => 'returned'])->assertOk();
        $this->assertDatabaseHas('items', ['id' => $found->id, 'status' => 'returned']);
    }

    public function test_reopening_releases_the_match(): void
    {
        $lost = $this->makeItem($this->student);
        $found = $this->makeItem($this->admin, ['type' => 'found']);
        $this->patchJson("/api/admin/items/{$lost->id}/status", ['status' => 'found', 'matched_item_id' => $found->id])->assertOk();

        $this->patchJson("/api/admin/items/{$lost->id}/status", ['status' => 'open'])->assertOk()
            ->assertJsonPath('data.matched_item_id', null);
        $this->assertDatabaseHas('items', ['id' => $found->id, 'status' => 'open', 'matched_item_id' => null]);
    }

    public function test_cannot_link_a_non_found_item_or_itself(): void
    {
        $lost = $this->makeItem($this->student);
        $otherLost = $this->makeItem($this->otherStudent);
        $found = $this->makeItem($this->admin, ['type' => 'found']);

        $this->patchJson("/api/admin/items/{$lost->id}/status", ['status' => 'found', 'matched_item_id' => $otherLost->id])
            ->assertStatus(422)->assertJsonValidationErrors('matched_item_id');
        $this->patchJson("/api/admin/items/{$lost->id}/status", ['status' => 'found', 'matched_item_id' => $lost->id])
            ->assertStatus(422)->assertJsonValidationErrors('matched_item_id');
        $this->patchJson("/api/admin/items/{$lost->id}/status", ['status' => 'found', 'matched_item_id' => 99999])
            ->assertStatus(422);
        $this->patchJson("/api/admin/items/{$found->id}/status", ['status' => 'found', 'matched_item_id' => $found->id])
            ->assertStatus(422);
        $this->patchJson("/api/admin/items/{$lost->id}/status", ['status' => 'bogus'])
            ->assertStatus(422)->assertJsonValidationErrors('status');

        $this->assertDatabaseHas('items', ['id' => $lost->id, 'status' => 'open', 'matched_item_id' => null]);
    }

    public function test_removal_needs_a_reason_and_can_be_restored(): void
    {
        $item = $this->makeItem($this->student);

        $this->deleteJson("/api/admin/items/{$item->id}")->assertStatus(422)->assertJsonValidationErrors('reason');
        $this->assertNotSoftDeleted('items', ['id' => $item->id]);

        $this->deleteJson("/api/admin/items/{$item->id}", ['reason' => 'Duplicate request'])->assertOk();
        $this->assertSoftDeleted('items', ['id' => $item->id, 'delete_reason' => 'Duplicate request']);

        // Hidden by default, visible with trashed=only.
        $this->assertSame([], $this->getJson('/api/items')->json('data'));
        $this->getJson('/api/items?trashed=only')->assertJsonPath('data.0.delete_reason', 'Duplicate request');

        // The student cannot see it anymore.
        Sanctum::actingAs($this->student);
        $this->getJson("/api/items/{$item->id}")->assertStatus(404);

        Sanctum::actingAs($this->admin);
        $this->postJson("/api/admin/items/{$item->id}/restore")->assertOk()->assertJsonPath('data.deleted_at', null);
        $this->assertNotSoftDeleted('items', ['id' => $item->id]);
        $this->postJson("/api/admin/items/{$item->id}/restore")->assertStatus(404);

        $this->assertDatabaseHas('activity_logs', ['action' => 'item.removed']);
        $this->assertDatabaseHas('activity_logs', ['action' => 'item.restored']);
    }

    public function test_admin_filters_items(): void
    {
        $this->makeItem($this->student, ['title' => 'Blue umbrella']);
        $this->makeItem($this->admin, ['type' => 'found', 'title' => 'Red scarf', 'date_reported' => now()->subDays(5)->toDateString()]);

        $this->assertCount(1, $this->getJson('/api/items?search=umbrella')->json('data'));
        $this->assertCount(1, $this->getJson('/api/items?type=found')->json('data'));
        $this->assertCount(1, $this->getJson('/api/items?date_to='.now()->subDays(3)->toDateString())->json('data'));
        $this->assertCount(2, $this->getJson('/api/items?category_id='.$this->category->id)->json('data'));
        $this->getJson('/api/items?per_page=1')->assertJsonPath('meta.total', 2)->assertJsonPath('meta.last_page', 2);
    }

    public function test_stats_have_the_expected_shape(): void
    {
        $this->makeItem($this->student);
        $this->makeItem($this->admin, ['type' => 'found']);
        $this->makeItem($this->student, ['status' => 'returned']);
        $this->makeItem($this->student)->delete();

        $response = $this->getJson('/api/admin/stats')->assertOk()->assertJsonStructure([
            'counters' => ['total', 'open_lost', 'open_found', 'matched', 'returned', 'closed', 'removed', 'students'],
            'per_category' => [['id', 'name', 'count']],
            'per_day' => [['date', 'count']],
            'recent_activity',
        ]);

        $this->assertSame(3, $response->json('counters.total'));
        $this->assertSame(1, $response->json('counters.open_lost'));
        $this->assertSame(1, $response->json('counters.open_found'));
        $this->assertSame(1, $response->json('counters.returned'));
        $this->assertSame(1, $response->json('counters.removed'));
        $this->assertSame(2, $response->json('counters.students'));
        $this->assertCount(14, $response->json('per_day'));
        $this->assertSame(4, $response->json('per_day.13.count'));
    }

    public function test_activity_log_is_paginated_and_filterable(): void
    {
        $this->postJson('/api/items', $this->itemPayload())->assertCreated();

        $this->getJson('/api/admin/activity?action=item.created')->assertOk()
            ->assertJsonPath('data.0.action', 'item.created')
            ->assertJsonPath('meta.total', 1)
            ->assertJsonStructure(['actions']);
    }
}
