<?php

namespace Tests\Feature;

use App\Models\ActivityLog;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Feature\Concerns\BuildsUniFindData;
use Tests\TestCase;

class AuthTest extends TestCase
{
    use BuildsUniFindData, RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->buildBaseData();
    }

    public function test_login_succeeds_and_returns_a_token_and_profile(): void
    {
        $response = $this->postJson('/api/auth/login', ['email' => 'student@uqu.edu.sa', 'password' => 'Demo@12345']);

        $response->assertOk()
            ->assertJsonStructure(['token', 'expires_at', 'user' => ['id', 'name', 'email', 'role']])
            ->assertJsonPath('user.role', 'student')
            ->assertJsonMissingPath('user.password');

        $token = $response->json('token');
        $this->withToken($token)->getJson('/api/auth/me')->assertOk()->assertJsonPath('user.email', 'student@uqu.edu.sa');

        $this->assertDatabaseHas('activity_logs', ['action' => 'auth.login', 'user_id' => $this->student->id]);
        $this->assertNotNull($this->student->tokens()->first()->expires_at);
    }

    public function test_login_fails_with_wrong_password_and_is_logged(): void
    {
        $this->postJson('/api/auth/login', ['email' => 'student@uqu.edu.sa', 'password' => 'wrong-password'])
            ->assertStatus(422)
            ->assertJsonValidationErrors('email');

        $this->assertDatabaseHas('activity_logs', ['action' => 'auth.login_failed']);
    }

    public function test_a_token_is_required(): void
    {
        $this->getJson('/api/auth/me')->assertStatus(401)->assertJsonStructure(['message']);
        $this->getJson('/api/items')->assertStatus(401);
        // Even without an Accept header, the API answers in JSON.
        $this->get('/api/items')->assertStatus(401)->assertHeader('Content-Type', 'application/json');
    }

    public function test_logout_revokes_the_token(): void
    {
        $token = $this->postJson('/api/auth/login', ['email' => 'student@uqu.edu.sa', 'password' => 'Demo@12345'])->json('token');

        $this->withToken($token)->postJson('/api/auth/logout')->assertOk();
        $this->assertSame(0, $this->student->tokens()->count());

        $this->app['auth']->forgetGuards();
        $this->withToken($token)->getJson('/api/auth/me')->assertStatus(401);
    }

    public function test_disabled_user_cannot_log_in_and_existing_tokens_stop_working(): void
    {
        $token = $this->postJson('/api/auth/login', ['email' => 'student@uqu.edu.sa', 'password' => 'Demo@12345'])->json('token');
        $this->student->update(['is_active' => false]);

        $this->postJson('/api/auth/login', ['email' => 'student@uqu.edu.sa', 'password' => 'Demo@12345'])->assertStatus(403);

        $this->app['auth']->forgetGuards();
        $this->withToken($token)->getJson('/api/auth/me')->assertStatus(401);
    }

    public function test_expired_tokens_are_rejected(): void
    {
        $token = $this->postJson('/api/auth/login', ['email' => 'student@uqu.edu.sa', 'password' => 'Demo@12345'])->json('token');

        $this->travel(13)->hours();
        $this->app['auth']->forgetGuards();
        $this->withToken($token)->getJson('/api/auth/me')->assertStatus(401);
    }

    public function test_login_is_rate_limited(): void
    {
        for ($i = 0; $i < 10; $i++) {
            $this->postJson('/api/auth/login', ['email' => 'student@uqu.edu.sa', 'password' => 'nope'])->assertStatus(422);
        }
        $this->postJson('/api/auth/login', ['email' => 'student@uqu.edu.sa', 'password' => 'nope'])
            ->assertStatus(429)->assertJsonStructure(['message']);
    }

    public function test_demo_accounts_are_listed_in_demo_mode(): void
    {
        config(['unifind.demo_mode' => true]);

        $this->getJson('/api/demo-accounts')->assertOk()
            ->assertJsonCount(2, 'data')
            ->assertJsonPath('data.0.email', 'student@uqu.edu.sa')
            ->assertJsonPath('data.1.email', 'admin@uqu.edu.sa');
    }

    public function test_demo_accounts_are_hidden_when_demo_mode_is_off(): void
    {
        config(['unifind.demo_mode' => false]);

        $this->getJson('/api/demo-accounts')->assertOk()->assertExactJson(['data' => []]);
    }

    public function test_unknown_api_routes_return_json_404(): void
    {
        $this->get('/api/does-not-exist')->assertStatus(404)->assertExactJson(['message' => 'Not found.']);
        $this->assertSame(0, ActivityLog::where('action', 'auth.login')->count());
    }
}
