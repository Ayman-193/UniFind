<?php

return [

    /*
    | When demo mode is on, GET /api/demo-accounts exposes the two seeded
    | demo logins so the login page can offer one-click sign-in buttons.
    */
    'demo_mode' => (bool) env('DEMO_MODE', false),

    /*
    | Password given to every seeded account.
    */
    'demo_password' => env('DEMO_PASSWORD', 'Demo@12345'),

    /*
    | Lifetime of an API token, in hours.
    */
    'token_hours' => 12,

    'demo_accounts' => [
        ['role' => 'student', 'label' => 'Continue as Student', 'email' => 'student@uqu.edu.sa'],
        ['role' => 'admin', 'label' => 'Continue as Admin', 'email' => 'admin@uqu.edu.sa'],
    ],
];
