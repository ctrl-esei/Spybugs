<?php
header("Content-Type: application/json");
session_start();

require_once __DIR__ . '/../config/config.php';

function response($status, $message, $extra = []) {
    echo json_encode(array_merge([
        "status"  => $status,
        "message" => $message,
    ], $extra));
    exit;
}

if (empty($_SESSION['admin_id'])) {
    response("error", "Not authenticated. Please log in again.");
}

$adminId = (int) $_SESSION['admin_id'];

try {
    $raw  = file_get_contents("php://input");
    $data = json_decode($raw, true);

    $currentPassword = trim($data["currentPassword"] ?? "");
    $newPassword     = trim($data["newPassword"] ?? "");

    if ($currentPassword === "" || $newPassword === "") {
        response("error", "Missing current or new password.");
    }

    if (strlen($newPassword) < 8) {
        response("error", "New password must be at least 8 characters.");
    }

    $stmt = $pdo->prepare("
        SELECT password_hash
        FROM admins
        WHERE id = ?
        LIMIT 1
    ");
    $stmt->execute([$adminId]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$user) {
        response("error", "User not found.");
    }

    if (!password_verify($currentPassword, $user["password_hash"])) {
        response("error", "Current password is incorrect.");
    }

    $newHash = password_hash($newPassword, PASSWORD_BCRYPT);

    $upd = $pdo->prepare("
        UPDATE admins
        SET password_hash = ?
        WHERE id = ?
    ");
    $upd->execute([$newHash, $adminId]);

    response("success", "Password changed successfully.");

} catch (Throwable $e) {
    response("error", "Failed to change password. Please try again.");
}