<?php
require_once __DIR__ . '/../config/config.php';

$token         = $_POST["token"] ?? "";
$currentPass   = $_POST["current_password"] ?? "";
$newPass       = $_POST["password"] ?? "";
$confirmPass   = $_POST["confirm_password"] ?? "";

if (!$token || !$currentPass || !$newPass || !$confirmPass) {
    die("Missing fields.");
}

if ($newPass !== $confirmPass) {
    die("New passwords do not match.");
}

$stmt = $pdo->prepare("
    SELECT id, password_hash, reset_token_expires_at
    FROM admins
    WHERE reset_token = ?
    LIMIT 1
");
$stmt->execute([$token]);
$user = $stmt->fetch(PDO::FETCH_ASSOC);

if (!$user) {
    die("Invalid or expired token.");
}

if (strtotime($user["reset_token_expires_at"]) < time()) {
    die("Reset token expired.");
}

if (!password_verify($currentPass, $user["password_hash"])) {
    die("Current password is incorrect.");
}

$newHash = password_hash($newPass, PASSWORD_BCRYPT);

$upd = $pdo->prepare("
    UPDATE admins
    SET password_hash = ?, reset_token = NULL, reset_token_expires_at = NULL
    WHERE id = ?
");
$upd->execute([$newHash, $user["id"]]);

echo "<h2>Password updated successfully!</h2>";
echo "<a href='../admin.html'>Login Now</a>";

