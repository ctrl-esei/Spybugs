<?php

require_once __DIR__ . '/response.php';

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

if (empty($_SESSION['admin_id'])) {
    json_error('Unauthorized', 401);
}

$CURRENT_ADMIN_ID = (int) $_SESSION['admin_id'];

