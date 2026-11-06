<?php

namespace Tests\Feature;

use App\Models\ActivityLog;
use App\Models\Category;
use App\Models\Item;
use App\Models\Location;
use App\Models\User;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use RuntimeException;
use Tests\TestCase;

class SeederTest extends TestCase
{
    use RefreshDatabase;

    public function test_seeder_creates_only_the_two_accounts_and_the_lists(): void
    {
        config(['unifind.admin_password' => 'asd', 'unifind.student_password' => 'asd']);

        $this->seed(DatabaseSeeder::class);

        $this->assertSame(2, User::count());
        $admin = User::where('email', 'admin@uqu.edu.sa')->firstOrFail();
        $student = User::where('email', 'student@uqu.edu.sa')->firstOrFail();
        $this->assertSame('admin', $admin->role);
        $this->assertSame('student', $student->role);
        $this->assertTrue(Hash::check('asd', $admin->password));
        $this->assertTrue(Hash::check('asd', $student->password));

        $this->assertGreaterThan(0, Category::count());
        $this->assertGreaterThan(0, Location::count());
        $this->assertSame(0, Item::withTrashed()->count());
        $this->assertSame(0, ActivityLog::count());
    }

    public function test_seeded_accounts_sign_in_with_a_short_password(): void
    {
        config(['unifind.admin_password' => 'asd', 'unifind.student_password' => 'asd']);
        $this->seed(DatabaseSeeder::class);

        $this->postJson('/api/auth/login', ['email' => 'admin@uqu.edu.sa', 'password' => 'asd'])->assertOk()->assertJsonPath('user.role', 'admin');
        $this->postJson('/api/auth/login', ['email' => 'student@uqu.edu.sa', 'password' => 'asd'])->assertOk()->assertJsonPath('user.role', 'student');
    }

    public function test_seeder_stops_when_a_password_is_missing(): void
    {
        config(['unifind.admin_password' => 'Admin@Pass123', 'unifind.student_password' => '']);

        $this->expectException(RuntimeException::class);
        $this->expectExceptionMessage('ADMIN_PASSWORD and STUDENT_PASSWORD');

        $this->seed(DatabaseSeeder::class);
    }
}
