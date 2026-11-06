<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\ActivityLog;
use App\Support\DbEditorSchema;
use Illuminate\Database\QueryException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Schema;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

/**
 * Whitelisted table editor for admins. Every query goes through the query builder
 * using table and column names from DbEditorSchema; no client input is ever used as SQL.
 */
class DbEditorController extends Controller
{
    public function index(): JsonResponse
    {
        $tables = collect(DbEditorSchema::TABLES)->map(fn (array $def, string $name) => [
            'name' => $name,
            'label' => $def['label'],
            'readonly' => $def['readonly'],
            'rows' => DB::table($name)->count(),
        ])->values();

        return response()->json(['data' => $tables]);
    }

    public function show(Request $request, string $table): JsonResponse
    {
        $this->ensureTable($table);
        $readable = DbEditorSchema::readableColumns($table);

        $request->validate([
            'search' => ['nullable', 'string', 'max:100'],
            'sort' => ['nullable', Rule::in($readable)],
            'dir' => ['nullable', Rule::in(['asc', 'desc'])],
            'per_page' => ['nullable', 'integer', 'min:5', 'max:100'],
        ]);

        $def = DbEditorSchema::table($table);
        $columns = DbEditorSchema::columns($table);

        $query = DB::table($table)->select($readable);

        if ($request->filled('search')) {
            $term = '%'.trim($request->input('search')).'%';
            $query->where(function ($q) use ($def, $term, $request) {
                foreach ($def['search'] as $col) {
                    $q->orWhere($col, 'like', $term);
                }
                if (ctype_digit((string) $request->input('search'))) {
                    $q->orWhere('id', (int) $request->input('search'));
                }
            });
        }

        $query->orderBy($request->input('sort', 'id'), $request->input('dir', 'desc'));
        if ($request->input('sort', 'id') !== 'id') {
            $query->orderBy('id', 'desc');
        }

        $page = $query->paginate((int) $request->input('per_page', 15))->withQueryString();
        $rows = collect($page->items())->map(fn ($row) => $this->castRow((array) $row, $columns));

        // Replace foreign-key ids with readable labels for the table view.
        $labels = [];
        foreach ($columns as $name => $col) {
            if ($col['type'] !== 'fk') {
                continue;
            }
            $ids = $rows->pluck($name)->filter()->unique()->values();
            $labels[$name] = $ids->isEmpty() ? [] : DB::table($col['fk']['table'])
                ->whereIn('id', $ids)->pluck($col['fk']['label'], 'id')->all();
        }
        $rows = $rows->map(function (array $row) use ($labels) {
            $row['_labels'] = collect($labels)->mapWithKeys(fn ($map, $col) => [$col => $map[$row[$col]] ?? null])->all();

            return $row;
        });

        return response()->json([
            'table' => [
                'name' => $table,
                'label' => $def['label'],
                'readonly' => $def['readonly'],
                'title_column' => $def['title'],
            ],
            'columns' => array_values(array_map(fn (array $c) => $this->publicColumn($c), $columns)),
            'data' => $rows->values(),
            'meta' => [
                'current_page' => $page->currentPage(),
                'last_page' => $page->lastPage(),
                'per_page' => $page->perPage(),
                'total' => $page->total(),
            ],
        ]);
    }

    public function store(Request $request, string $table): JsonResponse
    {
        $this->ensureWritable($table);
        $data = $this->validated($request, $table, null);

        $now = now();
        foreach (['created_at', 'updated_at'] as $stamp) {
            if (Schema::hasColumn($table, $stamp) && ! array_key_exists($stamp, $data)) {
                $data[$stamp] = $now;
            }
        }

        $id = DB::table($table)->insertGetId($data);
        $this->log('db.created', $table, $id, $this->describe($data));

        return response()->json(['message' => 'Row added.', 'id' => $id], 201);
    }

    public function update(Request $request, string $table, int $id): JsonResponse
    {
        $this->ensureWritable($table);
        $this->findRow($table, $id);

        $data = $this->validated($request, $table, $id);
        if ($table === 'users') {
            $this->guardSelf($request, $id, $data, deleting: false);
        }
        if ($table === 'items' && ($data['matched_item_id'] ?? null) === $id) {
            throw ValidationException::withMessages(['matched_item_id' => 'An item cannot be linked to itself.']);
        }

        if ($data === []) {
            return response()->json(['message' => 'Nothing to change.']);
        }
        if (Schema::hasColumn($table, 'updated_at')) {
            $data['updated_at'] = now();
        }

        DB::table($table)->where('id', $id)->update($data);
        $this->log('db.updated', $table, $id, $this->describe($data));

        return response()->json(['message' => 'Row saved.']);
    }

    public function destroy(Request $request, string $table, int $id): JsonResponse
    {
        $this->ensureWritable($table);
        $this->findRow($table, $id);

        if ($table === 'users') {
            $this->guardSelf($request, $id, [], deleting: true);
        }

        try {
            DB::table($table)->where('id', $id)->delete();
        } catch (QueryException $e) {
            if ($this->isForeignKeyViolation($e)) {
                return response()->json([
                    'message' => 'This row cannot be deleted because other records still use it. Reassign or delete those records first.',
                ], 409);
            }
            throw $e;
        }

        $this->log('db.deleted', $table, $id);

        return response()->json(['message' => 'Row deleted.']);
    }

    // ---------------------------------------------------------------------

    private function ensureTable(string $table): void
    {
        if (! DbEditorSchema::has($table)) {
            abort(response()->json(['message' => 'This table is not available in the database editor.'], 404));
        }
    }

    private function ensureWritable(string $table): void
    {
        $this->ensureTable($table);
        if (DbEditorSchema::table($table)['readonly']) {
            abort(response()->json(['message' => 'This table is read-only.'], 403));
        }
    }

    private function findRow(string $table, int $id): void
    {
        if (! DB::table($table)->where('id', $id)->exists()) {
            abort(response()->json(['message' => 'Not found.'], 404));
        }
    }

    /** Builds validation rules from the schema and returns only whitelisted, editable values. */
    private function validated(Request $request, string $table, ?int $id): array
    {
        $columns = DbEditorSchema::editableColumns($table);
        $creating = $id === null;
        $input = $request->only(array_keys($columns));

        // A blank password on edit keeps the current one.
        foreach ($columns as $name => $col) {
            if ($col['type'] === 'password' && ! $creating && blank($input[$name] ?? null)) {
                unset($input[$name]);
            }
        }

        $rules = [];
        foreach ($columns as $name => $col) {
            $r = [];
            if ($creating && $col['required']) {
                $r[] = 'required';
            } elseif ($col['required']) {
                $r[] = 'sometimes';
                $r[] = 'required';
            } elseif ($col['nullable']) {
                $r[] = 'nullable';
            } else {
                $r[] = 'sometimes';
            }

            $r = array_merge($r, match ($col['type']) {
                'int' => ['integer'],
                'string', 'text' => ['string', 'max:'.($col['max'] ?? 255)],
                'email' => ['email', 'max:'.($col['max'] ?? 255)],
                'password' => ['string', 'min:8', 'max:255'],
                'enum' => [Rule::in($col['options'])],
                'bool' => ['boolean'],
                'date', 'datetime' => ['date'],
                'fk' => ['integer', Rule::exists($col['fk']['table'], 'id')],
            });

            if (! empty($col['unique'])) {
                $r[] = Rule::unique($table, $name)->ignore($id);
            }
            $rules[$name] = $r;
        }

        $data = validator($input, $rules, [], collect($columns)->map(fn ($c) => strtolower($c['label']))->all())->validate();

        foreach ($data as $name => $value) {
            $type = $columns[$name]['type'];
            $data[$name] = match (true) {
                $value === null => null,
                $type === 'password' => Hash::make($value),
                $type === 'bool' => filter_var($value, FILTER_VALIDATE_BOOLEAN),
                $type === 'email' => strtolower(trim($value)),
                $type === 'int', $type === 'fk' => (int) $value,
                $type === 'datetime' => date('Y-m-d H:i:s', strtotime($value)),
                $type === 'date' => date('Y-m-d', strtotime($value)),
                default => $value,
            };
        }

        return $data;
    }

    /** An admin cannot delete, disable or demote their own account. */
    private function guardSelf(Request $request, int $id, array $data, bool $deleting): void
    {
        if ($request->user()->id !== $id) {
            return;
        }

        $message = match (true) {
            $deleting => 'You cannot delete your own account.',
            array_key_exists('is_active', $data) && ! $data['is_active'] => 'You cannot disable your own account.',
            array_key_exists('role', $data) && $data['role'] !== 'admin' => 'You cannot remove your own admin role.',
            default => null,
        };

        if ($message) {
            abort(response()->json(['message' => $message], 422));
        }
    }

    private function isForeignKeyViolation(QueryException $e): bool
    {
        $driverCode = $e->errorInfo[1] ?? null;

        return in_array($driverCode, [1451, 1452], true)
            || str_contains(strtolower($e->getMessage()), 'foreign key');
    }

    private function castRow(array $row, array $columns): array
    {
        foreach ($row as $name => $value) {
            if ($value === null) {
                continue;
            }
            $row[$name] = match ($columns[$name]['type'] ?? null) {
                'int', 'fk' => (int) $value,
                'bool' => (bool) $value,
                default => $value,
            };
        }

        return $row;
    }

    private function publicColumn(array $col): array
    {
        $out = [
            'name' => $col['name'],
            'label' => $col['label'],
            'type' => $col['type'],
            'editable' => $col['editable'],
            'required' => $col['required'],
            'nullable' => $col['nullable'],
            'list' => $col['list'],
        ];
        if (isset($col['max'])) {
            $out['max'] = $col['max'];
        }
        if ($col['type'] === 'enum') {
            $out['options'] = $col['options'];
        }
        if ($col['type'] === 'fk') {
            $out['fk'] = $col['fk'];
            if ($col['editable']) {
                $out['choices'] = DB::table($col['fk']['table'])
                    ->orderBy($col['fk']['label'])->limit(500)
                    ->get(['id', $col['fk']['label'].' as label']);
            }
        }

        return $out;
    }

    /** Field names and values for the audit log; password values are never logged. */
    private function describe(array $data): array
    {
        return collect($data)->except(['created_at', 'updated_at'])
            ->map(fn ($v, $k) => $k === 'password' ? '(changed)' : $v)->all();
    }

    private function log(string $action, string $table, int $id, array $fields = []): void
    {
        ActivityLog::create([
            'user_id' => auth()->id(),
            'action' => $action,
            'subject_type' => $table,
            'subject_id' => $id,
            'details' => $fields ? ['fields' => $fields] : null,
            'ip' => request()->ip(),
        ]);
    }
}
