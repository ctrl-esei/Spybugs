<?php
require_once __DIR__ . '/../config/config.php';

session_start();
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode([
        'status'  => 'error',
        'message' => 'Invalid request method.'
    ]);
    exit;
}

$rawBody = file_get_contents('php://input');
$input   = json_decode($rawBody, true);

$username = isset($input['username']) ? trim($input['username']) : '';
$password = isset($input['password']) ? trim($input['password']) : '';

if ($username === '' || $password === '') {
    echo json_encode([
        'status'  => 'error',
        'message' => 'Username and password are required.'
    ]);
    exit;
}

try {
    if (isset($pdo) && $pdo instanceof PDO) {
        $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    }

    $stmt = $pdo->prepare("
        SELECT id, username, password_hash
        FROM admins
        WHERE username = :username
        LIMIT 1
    ");
    $stmt->execute([':username' => $username]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$user) {
        echo json_encode([
            'status'  => 'error',
            'message' => 'Invalid username or password.'
        ]);
        exit;
    }

    if (!password_verify($password, $user['password_hash'])) {
        echo json_encode([
            'status'  => 'error',
            'message' => 'Invalid username or password.'
        ]);
        exit;
    }

    $_SESSION['admin_id'] = $user['id'];

    try {
        $update = $pdo->prepare("UPDATE admins SET last_login_at = NOW() WHERE id = :id");
        $update->execute([':id' => $user['id']]);
    } catch (Exception $e) {
        // ignore last_login_at error
    }

    echo json_encode([
        'status'  => 'success',
        'message' => 'Login successful.',
        'admin'   => [
            'id'       => $user['id'],
            'username' => $user['username']
        ]
    ]);
    exit;

} catch (Exception $e) {
    echo json_encode([
        'status'  => 'error',
        'message' => 'Server error: ' . $e->getMessage()
    ]);
    exit;
}