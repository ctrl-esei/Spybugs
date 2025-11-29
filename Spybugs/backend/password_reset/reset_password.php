<?php
header("Content-Type: application/json");

require_once __DIR__ . '/../config/config.php'; 

function response($status, $message, $extra = [])
{
    echo json_encode(array_merge([
        "status"  => $status,
        "message" => $message,
    ], $extra));
    exit;
}

try {
    $raw  = file_get_contents("php://input");
    $data = json_decode($raw, true);

    $token    = trim($data["token"]    ?? "");
    $password = trim($data["password"] ?? "");

    if ($token === "" || $password === "") {
        response("error", "Missing token or password.");
    }

    if (strlen($password) < 6) {
        response("error", "Password must be at least 6 characters.");
    }

    $stmt = $pdo->prepare("
        SELECT id, reset_token_expires_at
        FROM admins
        WHERE reset_token = ?
        LIMIT 1
    ");
    $stmt->execute([$token]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$user) {
        response("error", "Invalid or expired reset token.");
    }

    if (!empty($user["reset_token_expires_at"])) {
        $expiresAt = strtotime($user["reset_token_expires_at"]);
        if ($expiresAt !== false && $expiresAt < time()) {
            response("error", "Token has expired. Please request a new reset.");
        }
    }

    $newHash = password_hash($password, PASSWORD_BCRYPT);

    $upd = $pdo->prepare("
        UPDATE admins
        SET password_hash = ?, reset_token = NULL, reset_token_expires_at = NULL
        WHERE id = ?
    ");
    $upd->execute([$newHash, $user["id"]]);

    response("success", "Password updated successfully!");

} catch (Throwable $e) {

    response("error", "Failed to reset password. Please try again.", [
    ]);
}