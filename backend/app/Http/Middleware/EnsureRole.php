<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Usage: ->middleware('role:admin') or 'role:admin,student'.
 */
class EnsureRole
{
    public function handle(Request $request, Closure $next, string ...$roles): Response
    {
        $user = $request->user();

        if (! $user) {
            return response()->json(['message' => 'You are not signed in or your session has expired.'], 401);
        }

        if (! in_array($user->role, $roles, true)) {
            return response()->json(['message' => 'You do not have permission to do this.'], 403);
        }

        return $next($request);
    }
}
