<?php

namespace App\Providers;

use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;
use Laravel\Sanctum\Sanctum;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        //
    }

    public function boot(): void
    {
        // 10 login attempts per minute per IP address.
        RateLimiter::for('login', fn (Request $request) => Limit::perMinute(10)->by($request->ip()));

        // A disabled account's existing tokens stop working immediately.
        Sanctum::authenticateAccessTokensUsing(
            fn ($accessToken, bool $isValid) => $isValid && (bool) $accessToken->tokenable?->is_active
        );
    }
}
