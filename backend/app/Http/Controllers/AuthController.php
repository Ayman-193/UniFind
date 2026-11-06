<?php

namespace App\Http\Controllers;

use App\Models\ActivityLog;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class AuthController extends Controller
{
    public function login(Request $request): JsonResponse
    {
        $credentials = $request->validate([
            'email' => ['required', 'email', 'max:255'],
            'password' => ['required', 'string', 'max:255'],
        ]);

        $email = strtolower(trim($credentials['email']));
        $user = User::where('email', $email)->first();

        if (! $user || ! Hash::check($credentials['password'], $user->password)) {
            ActivityLog::record('auth.login_failed', 'users', ['email' => $email], $user);

            return response()->json([
                'message' => 'The email or password is incorrect.',
                'errors' => ['email' => ['The email or password is incorrect.']],
            ], 422);
        }

        if (! $user->is_active) {
            ActivityLog::record('auth.login_failed', $user, ['email' => $email, 'reason' => 'account disabled'], $user);

            return response()->json(['message' => 'This account has been disabled. Contact the Lost & Found Office.'], 403);
        }

        $expiresAt = now()->addHours(config('unifind.token_hours', 12));
        $token = $user->createToken('unifind-spa', ['*'], $expiresAt);

        ActivityLog::record('auth.login', $user, [], $user);

        return response()->json([
            'token' => $token->plainTextToken,
            'expires_at' => $expiresAt->toIso8601String(),
            'user' => $user->toProfile(),
        ]);
    }

    public function logout(Request $request): JsonResponse
    {
        $user = $request->user();
        $user->currentAccessToken()?->delete();
        ActivityLog::record('auth.logout', $user);

        return response()->json(['message' => 'Signed out.']);
    }

    public function me(Request $request): JsonResponse
    {
        return response()->json(['user' => $request->user()->toProfile()]);
    }
}
