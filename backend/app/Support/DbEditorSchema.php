<?php

namespace App\Support;

/**
 * The only tables and columns the admin database editor may touch.
 * Anything not listed here (tokens, sessions, migrations, cache, jobs...) is invisible to the API.
 *
 * Column keys:
 *   type      int | string | text | email | password | enum | bool | date | datetime | fk
 *   label     human label for forms and table headers
 *   editable  false for ids and timestamps
 *   required  required on create (and on update when present)
 *   nullable  may be stored as NULL
 *   max       max length for string-like columns
 *   options   allowed values for enum columns
 *   unique    value must be unique in the table
 *   fk        ['table' => ..., 'label' => column shown instead of the id]
 *   list      false hides a column from the table view (still in forms)
 */
final class DbEditorSchema
{
    public const TABLES = [
        'users' => [
            'label' => 'Users',
            'readonly' => false,
            'search' => ['name', 'email', 'student_id'],
            'title' => 'name',
            'columns' => [
                'id' => ['type' => 'int', 'label' => 'ID', 'editable' => false],
                'name' => ['type' => 'string', 'label' => 'Name', 'required' => true, 'max' => 255],
                'email' => ['type' => 'email', 'label' => 'Email', 'required' => true, 'max' => 255, 'unique' => true],
                'password' => ['type' => 'password', 'label' => 'Password', 'required' => true, 'list' => false],
                'role' => ['type' => 'enum', 'label' => 'Role', 'required' => true, 'options' => ['student', 'admin']],
                'student_id' => ['type' => 'string', 'label' => 'Student ID', 'nullable' => true, 'max' => 20],
                'phone' => ['type' => 'string', 'label' => 'Phone', 'nullable' => true, 'max' => 30],
                'is_active' => ['type' => 'bool', 'label' => 'Active'],
                'created_at' => ['type' => 'datetime', 'label' => 'Created', 'editable' => false],
            ],
        ],
        'categories' => [
            'label' => 'Categories',
            'readonly' => false,
            'search' => ['name'],
            'title' => 'name',
            'columns' => [
                'id' => ['type' => 'int', 'label' => 'ID', 'editable' => false],
                'name' => ['type' => 'string', 'label' => 'Name', 'required' => true, 'max' => 60, 'unique' => true],
                'created_at' => ['type' => 'datetime', 'label' => 'Created', 'editable' => false],
            ],
        ],
        'locations' => [
            'label' => 'Locations',
            'readonly' => false,
            'search' => ['name'],
            'title' => 'name',
            'columns' => [
                'id' => ['type' => 'int', 'label' => 'ID', 'editable' => false],
                'name' => ['type' => 'string', 'label' => 'Name', 'required' => true, 'max' => 80, 'unique' => true],
                'created_at' => ['type' => 'datetime', 'label' => 'Created', 'editable' => false],
            ],
        ],
        'items' => [
            'label' => 'Items',
            'readonly' => false,
            'search' => ['title', 'description'],
            'title' => 'title',
            'columns' => [
                'id' => ['type' => 'int', 'label' => 'ID', 'editable' => false],
                'type' => ['type' => 'enum', 'label' => 'Type', 'required' => true, 'options' => ['lost', 'found']],
                'title' => ['type' => 'string', 'label' => 'Title', 'required' => true, 'max' => 80],
                'description' => ['type' => 'text', 'label' => 'Description', 'required' => true, 'max' => 2000, 'list' => false],
                'user_id' => ['type' => 'fk', 'label' => 'Reporter', 'required' => true, 'fk' => ['table' => 'users', 'label' => 'name']],
                'category_id' => ['type' => 'fk', 'label' => 'Category', 'required' => true, 'fk' => ['table' => 'categories', 'label' => 'name']],
                'location_id' => ['type' => 'fk', 'label' => 'Location', 'required' => true, 'fk' => ['table' => 'locations', 'label' => 'name']],
                'date_reported' => ['type' => 'date', 'label' => 'Date', 'required' => true],
                'status' => ['type' => 'enum', 'label' => 'Status', 'required' => true, 'options' => ['open', 'found', 'returned', 'closed']],
                'contact_info' => ['type' => 'string', 'label' => 'Contact', 'nullable' => true, 'max' => 120, 'list' => false],
                'admin_note' => ['type' => 'text', 'label' => 'Admin note', 'nullable' => true, 'max' => 1000, 'list' => false],
                'matched_item_id' => ['type' => 'fk', 'label' => 'Matched item', 'nullable' => true, 'fk' => ['table' => 'items', 'label' => 'title'], 'list' => false],
                'delete_reason' => ['type' => 'string', 'label' => 'Removal reason', 'nullable' => true, 'max' => 255, 'list' => false],
                'deleted_at' => ['type' => 'datetime', 'label' => 'Removed at', 'nullable' => true],
                'created_at' => ['type' => 'datetime', 'label' => 'Created', 'editable' => false, 'list' => false],
            ],
        ],
        'activity_logs' => [
            'label' => 'Activity log',
            'readonly' => true,
            'search' => ['action', 'subject_type', 'ip'],
            'title' => 'action',
            'columns' => [
                'id' => ['type' => 'int', 'label' => 'ID', 'editable' => false],
                'user_id' => ['type' => 'fk', 'label' => 'User', 'nullable' => true, 'fk' => ['table' => 'users', 'label' => 'name']],
                'action' => ['type' => 'string', 'label' => 'Action'],
                'subject_type' => ['type' => 'string', 'label' => 'Subject'],
                'subject_id' => ['type' => 'int', 'label' => 'Subject ID'],
                'details' => ['type' => 'text', 'label' => 'Details'],
                'ip' => ['type' => 'string', 'label' => 'IP'],
                'created_at' => ['type' => 'datetime', 'label' => 'Time'],
            ],
        ],
    ];

    public static function has(string $table): bool
    {
        return array_key_exists($table, self::TABLES);
    }

    public static function table(string $table): array
    {
        return self::TABLES[$table];
    }

    /** @return array<string, array> */
    public static function columns(string $table): array
    {
        return collect(self::TABLES[$table]['columns'])
            ->map(fn (array $col, string $name) => $col + [
                'name' => $name,
                'editable' => ! self::TABLES[$table]['readonly'],
                'required' => false,
                'nullable' => false,
                'list' => true,
            ])
            ->all();
    }

    /** Columns that may be selected and sent to the client (never passwords). */
    public static function readableColumns(string $table): array
    {
        return array_keys(array_filter(self::columns($table), fn (array $c) => $c['type'] !== 'password'));
    }

    public static function editableColumns(string $table): array
    {
        return array_filter(self::columns($table), fn (array $c) => $c['editable']);
    }
}
