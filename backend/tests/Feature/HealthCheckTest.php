<?php

namespace Tests\Feature;

use Tests\TestCase;

class HealthCheckTest extends TestCase
{
    public function test_the_health_check_responds(): void
    {
        $this->get('/up')->assertOk();
    }
}
