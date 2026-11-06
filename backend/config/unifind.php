<?php

return [

    /*
    | Passwords for the two accounts created by the database seeder.
    */
    'admin_password' => env('ADMIN_PASSWORD'),
    'student_password' => env('STUDENT_PASSWORD'),

    /*
    | Lifetime of an API token, in hours.
    */
    'token_hours' => 12,
];
