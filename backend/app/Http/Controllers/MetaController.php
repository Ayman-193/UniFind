<?php

namespace App\Http\Controllers;

use App\Models\Category;
use App\Models\Location;
use Illuminate\Http\JsonResponse;

class MetaController extends Controller
{
    public function __invoke(): JsonResponse
    {
        return response()->json([
            'categories' => Category::orderBy('name')->get(['id', 'name']),
            'locations' => Location::orderBy('name')->get(['id', 'name']),
            'types' => ['lost', 'found'],
            'statuses' => ['open', 'found', 'returned', 'closed'],
        ]);
    }
}
