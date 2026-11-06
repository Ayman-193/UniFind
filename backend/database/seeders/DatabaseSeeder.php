<?php

namespace Database\Seeders;

use App\Models\Category;
use App\Models\Location;
use App\Models\User;
use Illuminate\Database\Seeder;
use RuntimeException;

/**
 * Creates the admin account, the student account and the category and
 * location lists the forms need. Nothing else.
 */
class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $adminPassword = (string) config('unifind.admin_password');
        $studentPassword = (string) config('unifind.student_password');

        if ($adminPassword === '' || $studentPassword === '') {
            throw new RuntimeException('Set ADMIN_PASSWORD and STUDENT_PASSWORD in backend/.env before seeding.');
        }

        User::create([
            'name' => 'Lost & Found Office',
            'email' => 'admin@uqu.edu.sa',
            'password' => $adminPassword,
            'role' => 'admin',
        ]);

        User::create([
            'name' => 'Student',
            'email' => 'student@uqu.edu.sa',
            'password' => $studentPassword,
            'role' => 'student',
        ]);

        foreach (['Electronics', 'Wallets & Cards', 'Keys', 'Books & Notes', 'Bags', 'Clothing', 'ID & Documents', 'Other'] as $name) {
            Category::create(['name' => $name]);
        }

        foreach (['Main Library', 'Engineering Building', 'Cafeteria', 'Computer Science Lab', 'Mosque', 'Parking Lot A', 'Student Affairs', 'Lecture Hall B2', 'Sports Hall'] as $name) {
            Location::create(['name' => $name]);
        }
    }
}
