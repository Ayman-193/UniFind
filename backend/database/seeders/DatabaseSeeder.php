<?php

namespace Database\Seeders;

use App\Models\ActivityLog;
use App\Models\Category;
use App\Models\Item;
use App\Models\Location;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Carbon;

/**
 * Fictional demo data only. Every account uses DEMO_PASSWORD.
 */
class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $password = config('unifind.demo_password');

        $admin = User::create([
            'name' => 'Lost & Found Office',
            'email' => 'admin@uqu.edu.sa',
            'password' => $password,
            'role' => 'admin',
            'phone' => '012 555 0100',
        ]);

        $student = User::create([
            'name' => 'Demo Student',
            'email' => 'student@uqu.edu.sa',
            'password' => $password,
            'role' => 'student',
            'student_id' => '444100001',
            'phone' => '050 555 0101',
        ]);

        $others = collect([
            ['Sara Alharbi', 'sara.alharbi@uqu.edu.sa', '444100002'],
            ['Omar Alzahrani', 'omar.alzahrani@uqu.edu.sa', '444100003'],
            ['Lina Alghamdi', 'lina.alghamdi@uqu.edu.sa', '444100004'],
        ])->map(fn ($s) => User::create([
            'name' => $s[0], 'email' => $s[1], 'password' => $password,
            'role' => 'student', 'student_id' => $s[2],
        ]));

        $categories = collect(['Electronics', 'Wallets & Cards', 'Keys', 'Books & Notes', 'Bags', 'Clothing', 'ID & Documents', 'Other'])
            ->mapWithKeys(fn ($name) => [$name => Category::create(['name' => $name])->id]);

        $locations = collect(['Main Library', 'Engineering Building', 'Cafeteria', 'Computer Science Lab', 'Mosque', 'Parking Lot A', 'Student Affairs', 'Lecture Hall B2', 'Sports Hall'])
            ->mapWithKeys(fn ($name) => [$name => Location::create(['name' => $name])->id]);

        $make = function (array $row) use ($categories, $locations): Item {
            $created = Carbon::now()->subDays($row['days'])->setTime(9 + ($row['days'] % 8), 15 + $row['days']);
            $item = new Item([
                'user_id' => $row['user']->id,
                'category_id' => $categories[$row['category']],
                'location_id' => $locations[$row['location']],
                'type' => $row['type'],
                'title' => $row['title'],
                'description' => $row['description'],
                'date_reported' => $created->copy()->subDays($row['type'] === 'lost' ? 1 : 0)->toDateString(),
                'contact_info' => $row['contact'] ?? null,
                'status' => $row['status'] ?? 'open',
                'admin_note' => $row['note'] ?? null,
            ]);
            $item->created_at = $created;
            $item->updated_at = $created;
            $item->save();

            return $item;
        };

        // ---- Found items registered by the office ----
        $foundAirpods = $make(['user' => $admin, 'type' => 'found', 'category' => 'Electronics', 'location' => 'Main Library', 'days' => 12,
            'title' => 'White wireless earbuds in case', 'description' => 'Charging case with a small scratch on the lid. Found on a desk on the second floor, quiet study area.']);
        $make(['user' => $admin, 'type' => 'found', 'category' => 'Keys', 'location' => 'Parking Lot A', 'days' => 9,
            'title' => 'Car key with blue lanyard', 'description' => 'Single car key with a blue university lanyard and a small metal tag. Handed in by campus security.']);
        $make(['user' => $admin, 'type' => 'found', 'category' => 'Books & Notes', 'location' => 'Lecture Hall B2', 'days' => 6,
            'title' => 'Calculus notebook, green cover', 'description' => 'A5 notebook with handwritten Calculus II notes. No name on the cover, a few sticky notes inside.']);
        $make(['user' => $admin, 'type' => 'found', 'category' => 'Clothing', 'location' => 'Sports Hall', 'days' => 4,
            'title' => 'Grey zip-up hoodie, size M', 'description' => 'Plain grey hoodie left on the benches after evening practice. Washed and kept at the office.']);
        $make(['user' => $admin, 'type' => 'found', 'category' => 'Electronics', 'location' => 'Computer Science Lab', 'days' => 2,
            'title' => 'USB-C laptop charger, 65 W', 'description' => 'Black USB-C power adapter with a braided cable. Left plugged in at workstation 14.']);
        $foundWallet = $make(['user' => $admin, 'type' => 'found', 'category' => 'Wallets & Cards', 'location' => 'Cafeteria', 'days' => 3,
            'title' => 'Brown leather wallet', 'description' => 'Brown bifold wallet with a university card inside. The owner must confirm the name on the card to collect it.']);
        $make(['user' => $admin, 'type' => 'found', 'category' => 'Bags', 'location' => 'Mosque', 'days' => 1,
            'title' => 'Black backpack with laptop sleeve', 'description' => 'Medium black backpack with an empty laptop sleeve and a water bottle in the side pocket.']);

        // ---- Lost requests from students ----
        $walletRequest = $make(['user' => $student, 'type' => 'lost', 'category' => 'Wallets & Cards', 'location' => 'Cafeteria', 'days' => 5,
            'title' => 'Lost my brown wallet', 'description' => 'Brown leather bifold wallet with my student card and a bank card. I think I left it on a table at lunch.',
            'contact' => '050 555 0101']);
        $walletRequest->update([
            'status' => 'found',
            'matched_item_id' => $foundWallet->id,
            'admin_note' => 'Good news: we have your wallet. Collect it from Student Affairs, room 12, Sunday to Thursday 8:00 to 14:00. Bring your national ID.',
        ]);
        $foundWallet->update(['status' => 'found', 'matched_item_id' => $walletRequest->id]);

        $make(['user' => $student, 'type' => 'lost', 'category' => 'Electronics', 'location' => 'Engineering Building', 'days' => 1,
            'title' => 'Scientific calculator Casio fx-991', 'description' => 'Grey Casio fx-991EX with my initials scratched on the back. Probably left in room E-204 after the exam.',
            'contact' => '050 555 0101']);
        $make(['user' => $student, 'type' => 'lost', 'category' => 'Keys', 'location' => 'Main Library', 'days' => 13,
            'title' => 'Dorm room key', 'description' => 'Small silver key on a red keyring shaped like a star.',
            'status' => 'closed', 'note' => 'Closed at your request: you found the key at home.']);

        $returned = $make(['user' => $others[0], 'type' => 'lost', 'category' => 'Electronics', 'location' => 'Main Library', 'days' => 11,
            'title' => 'Wireless earbuds', 'description' => 'White earbuds in a charging case, scratch on the lid. Lost in the library study area.',
            'contact' => 'sara.alharbi@uqu.edu.sa']);
        $returned->update(['status' => 'returned', 'matched_item_id' => $foundAirpods->id, 'admin_note' => 'Collected from Student Affairs.']);
        $foundAirpods->update(['status' => 'returned', 'matched_item_id' => $returned->id]);

        $make(['user' => $others[1], 'type' => 'lost', 'category' => 'ID & Documents', 'location' => 'Student Affairs', 'days' => 8,
            'title' => 'Passport-size photo envelope', 'description' => 'White envelope with six passport photos and a copy of my residence permit.']);
        $make(['user' => $others[1], 'type' => 'lost', 'category' => 'Bags', 'location' => 'Lecture Hall B2', 'days' => 7,
            'title' => 'Navy laptop bag', 'description' => 'Navy messenger bag with a 14-inch laptop inside. Has a keychain with a small football.',
            'contact' => '055 555 0133']);
        $make(['user' => $others[2], 'type' => 'lost', 'category' => 'Clothing', 'location' => 'Sports Hall', 'days' => 10,
            'title' => 'Black running shoes', 'description' => 'Black running shoes, size 39, in a drawstring bag.']);

        $spam = $make(['user' => $others[2], 'type' => 'lost', 'category' => 'Other', 'location' => 'Cafeteria', 'days' => 6,
            'title' => 'test test', 'description' => 'Duplicate request posted by mistake, please ignore.']);
        $spam->update(['delete_reason' => 'Duplicate request created by mistake.']);
        $spam->delete();

        // A little history for the activity log and dashboard.
        foreach (Item::withTrashed()->orderBy('created_at')->get() as $item) {
            $log = ActivityLog::create([
                'user_id' => $item->user_id, 'action' => 'item.created', 'subject_type' => 'Item',
                'subject_id' => $item->id, 'details' => ['type' => $item->type, 'title' => $item->title], 'ip' => '127.0.0.1',
            ]);
            $log->created_at = $item->created_at;
            $log->save();
        }
        $log = ActivityLog::create([
            'user_id' => $admin->id, 'action' => 'item.status_changed', 'subject_type' => 'Item', 'subject_id' => $walletRequest->id,
            'details' => ['from' => 'open', 'to' => 'found', 'matched_item_id' => $foundWallet->id], 'ip' => '127.0.0.1',
        ]);
        $log->created_at = Carbon::now()->subDays(2);
        $log->save();
        $log = ActivityLog::create([
            'user_id' => $admin->id, 'action' => 'item.removed', 'subject_type' => 'Item', 'subject_id' => $spam->id,
            'details' => ['reason' => $spam->delete_reason], 'ip' => '127.0.0.1',
        ]);
        $log->created_at = Carbon::now()->subDays(5);
        $log->save();
    }
}
