<?php

use App\Http\Controllers\Admin\AdminItemController;
use App\Http\Controllers\Admin\DashboardController;
use App\Http\Controllers\Admin\DbEditorController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\ItemController;
use App\Http\Controllers\MetaController;
use Illuminate\Support\Facades\Route;

/*
| Public
*/
Route::post('/auth/login', [AuthController::class, 'login'])->middleware('throttle:login');

/*
| Any signed-in user (student or admin). Role rules are applied inside the controllers.
*/
Route::middleware('auth:sanctum')->group(function () {
    Route::post('/auth/logout', [AuthController::class, 'logout']);
    Route::get('/auth/me', [AuthController::class, 'me']);

    Route::get('/meta', MetaController::class);

    Route::get('/items', [ItemController::class, 'index']);
    Route::post('/items', [ItemController::class, 'store']);
    Route::get('/items/{id}', [ItemController::class, 'show'])->whereNumber('id');
    Route::put('/items/{id}', [ItemController::class, 'update'])->whereNumber('id');

    /*
    | Admin only
    */
    Route::middleware('role:admin')->prefix('admin')->group(function () {
        Route::patch('/items/{id}/status', [AdminItemController::class, 'updateStatus'])->whereNumber('id');
        Route::delete('/items/{id}', [AdminItemController::class, 'destroy'])->whereNumber('id');
        Route::post('/items/{id}/restore', [AdminItemController::class, 'restore'])->whereNumber('id');

        Route::get('/stats', [DashboardController::class, 'stats']);
        Route::get('/activity', [DashboardController::class, 'activity']);

        Route::get('/db', [DbEditorController::class, 'index']);
        Route::get('/db/{table}', [DbEditorController::class, 'show']);
        Route::post('/db/{table}', [DbEditorController::class, 'store']);
        Route::put('/db/{table}/{id}', [DbEditorController::class, 'update'])->whereNumber('id');
        Route::delete('/db/{table}/{id}', [DbEditorController::class, 'destroy'])->whereNumber('id');
    });
});
