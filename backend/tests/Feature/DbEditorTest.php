<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Laravel\Sanctum\Sanctum;
use Tests\Feature\Concerns\BuildsUniFindData;
use Tests\TestCase;

class DbEditorTest extends TestCase
{
    use BuildsUniFindData, RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->buildBaseData();
        Sanctum::actingAs($this->admin);
    }

    public function test_only_whitelisted_tables_are_available(): void
    {
        $names = collect($this->getJson('/api/admin/db')->assertOk()->json('data'))->pluck('name')->all();
        $this->assertSame(['users', 'categories', 'locations', 'items', 'activity_logs'], $names);

        foreach (['personal_access_tokens', 'sessions', 'migrations', 'cache', 'jobs', 'password_reset_tokens'] as $table) {
            $this->getJson("/api/admin/db/{$table}")->assertStatus(404);
            $this->postJson("/api/admin/db/{$table}", ['x' => 1])->assertStatus(404);
            $this->deleteJson("/api/admin/db/{$table}/1")->assertStatus(404);
        }
    }

    public function test_table_view_returns_rows_and_schema(): void
    {
        $this->getJson('/api/admin/db/categories?search=Elec&sort=name&dir=asc')->assertOk()
            ->assertJsonPath('data.0.name', 'Electronics')
            ->assertJsonPath('table.readonly', false)
            ->assertJsonStructure(['columns' => [['name', 'label', 'type', 'editable']], 'meta' => ['total']]);

        $this->getJson('/api/admin/db/categories?sort=password')->assertStatus(422);
    }

    public function test_password_is_never_returned_and_is_hashed(): void
    {
        $response = $this->getJson('/api/admin/db/users')->assertOk();
        foreach ($response->json('data') as $row) {
            $this->assertArrayNotHasKey('password', $row);
            $this->assertArrayNotHasKey('remember_token', $row);
        }
        $this->assertStringNotContainsString('$2y$', $response->getContent());

        $id = $this->postJson('/api/admin/db/users', [
            'name' => 'New Student', 'email' => 'New.Student@uqu.edu.sa', 'password' => 'Secret@123', 'role' => 'student', 'is_active' => true,
        ])->assertCreated()->json('id');

        $user = User::find($id);
        $this->assertSame('new.student@uqu.edu.sa', $user->email);
        $this->assertNotSame('Secret@123', $user->password);
        $this->assertTrue(Hash::check('Secret@123', $user->password));

        // A blank password on edit keeps the old one.
        $this->putJson("/api/admin/db/users/{$id}", ['name' => 'Renamed', 'password' => ''])->assertOk();
        $this->assertTrue(Hash::check('Secret@123', $user->fresh()->password));
        $this->assertSame('Renamed', $user->fresh()->name);

        // The audit log never stores the password.
        $this->assertStringNotContainsString('Secret@123', \App\Models\ActivityLog::all()->toJson());

        $this->postJson('/api/admin/db/users', ['name' => 'X', 'email' => 'student@uqu.edu.sa', 'password' => 'short', 'role' => 'boss'])
            ->assertStatus(422)->assertJsonValidationErrors(['email', 'password', 'role']);
    }

    public function test_admin_cannot_delete_disable_or_demote_themselves(): void
    {
        $id = $this->admin->id;

        $this->deleteJson("/api/admin/db/users/{$id}")->assertStatus(422);
        $this->putJson("/api/admin/db/users/{$id}", ['is_active' => false])->assertStatus(422);
        $this->putJson("/api/admin/db/users/{$id}", ['role' => 'student'])->assertStatus(422);

        $this->assertDatabaseHas('users', ['id' => $id, 'role' => 'admin', 'is_active' => true]);

        // Editing their own name is fine.
        $this->putJson("/api/admin/db/users/{$id}", ['name' => 'Office'])->assertOk();
    }

    public function test_activity_logs_are_read_only(): void
    {
        $this->getJson('/api/admin/db/activity_logs')->assertOk()->assertJsonPath('table.readonly', true);

        $this->postJson('/api/admin/db/activity_logs', ['action' => 'fake'])->assertStatus(403);
        $this->putJson('/api/admin/db/activity_logs/1', ['action' => 'fake'])->assertStatus(403);
        $this->deleteJson('/api/admin/db/activity_logs/1')->assertStatus(403);
        $this->assertDatabaseMissing('activity_logs', ['action' => 'fake']);
    }

    public function test_crud_on_categories_is_logged(): void
    {
        $id = $this->postJson('/api/admin/db/categories', ['name' => 'Umbrellas'])->assertCreated()->json('id');
        $this->postJson('/api/admin/db/categories', ['name' => 'Umbrellas'])->assertStatus(422)->assertJsonValidationErrors('name');
        $this->putJson("/api/admin/db/categories/{$id}", ['name' => 'Umbrellas & Rain'])->assertOk();
        $this->deleteJson("/api/admin/db/categories/{$id}")->assertOk();
        $this->deleteJson("/api/admin/db/categories/{$id}")->assertStatus(404);

        foreach (['db.created', 'db.updated', 'db.deleted'] as $action) {
            $this->assertDatabaseHas('activity_logs', ['action' => $action, 'subject_type' => 'categories', 'subject_id' => $id]);
        }
    }

    public function test_foreign_key_blocked_delete_returns_409(): void
    {
        $this->makeItem($this->student);

        $this->deleteJson("/api/admin/db/categories/{$this->category->id}")->assertStatus(409)->assertJsonStructure(['message']);
        $this->deleteJson("/api/admin/db/users/{$this->student->id}")->assertStatus(409);
        $this->assertDatabaseHas('categories', ['id' => $this->category->id]);
    }

    public function test_item_columns_are_validated(): void
    {
        $item = $this->makeItem($this->student);

        $this->putJson("/api/admin/db/items/{$item->id}", ['status' => 'lost-forever', 'category_id' => 999])
            ->assertStatus(422)->assertJsonValidationErrors(['status', 'category_id']);
        $this->putJson("/api/admin/db/items/{$item->id}", ['matched_item_id' => $item->id])->assertStatus(422);
        $this->putJson("/api/admin/db/items/{$item->id}", ['status' => 'closed', 'id' => 555])->assertOk();
        $this->assertDatabaseHas('items', ['id' => $item->id, 'status' => 'closed']);
    }
}
