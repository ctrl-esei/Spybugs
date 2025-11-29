<?php
header("Content-Type: application/json");

require_once __DIR__ . '/../config/config.php';        
require_once __DIR__ . '/../config/mailer_config.php'; 

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

require_once __DIR__ . '/../lib/PHPMailer/src/Exception.php';
require_once __DIR__ . '/../lib/PHPMailer/src/PHPMailer.php';
require_once __DIR__ . '/../lib/PHPMailer/src/SMTP.php';


function json_response($status, $message, $extra = [])
{
    echo json_encode(array_merge([
        'status'  => $status,
        'message' => $message,
    ], $extra));
    exit;
}

try {
    $raw  = file_get_contents("php://input");
    $data = json_decode($raw, true);

    if (!is_array($data)) {
        json_response('error', 'Invalid request format.');
    }

    $identifier = trim($data['identifier'] ?? $data['email'] ?? '');

    if ($identifier === '') {
        json_response('error', 'Please enter your email or username.');
    }

    $stmt = $pdo->prepare("
        SELECT id, username, email
        FROM admins
        WHERE email = ? OR username = ?
        LIMIT 1
    ");
    $stmt->execute([$identifier, $identifier]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$user || empty($user['email'])) {
        json_response(
            'success',
            'If an account exists, a password reset link has been sent.'
        );
    }

    $email = $user['email'];

    $token   = bin2hex(random_bytes(32));
    $expires = date('Y-m-d H:i:s', time() + 3600);

    $upd = $pdo->prepare("
        UPDATE admins
        SET reset_token = ?, reset_token_expires_at = ?
        WHERE id = ?
    ");
    $upd->execute([$token, $expires, $user['id']]);

    $resetLink = "http://localhost/Spybugs/reset_password.html?token=" . urlencode($token);

    $mail = new PHPMailer(true);

    $mail->isSMTP();
    $mail->Host       = MAIL_HOST;
    $mail->SMTPAuth   = true;
    $mail->Username   = MAIL_USER;
    $mail->Password   = MAIL_PASS;
    $mail->SMTPSecure = (MAIL_SECURE === 'tls')
        ? PHPMailer::ENCRYPTION_STARTTLS
        : PHPMailer::ENCRYPTION_SMTPS;
    $mail->Port       = MAIL_PORT;

    $mail->setFrom(MAIL_USER, 'Spybugs Printing Shop');
    $mail->addAddress($email, $user['username']);

    $mail->isHTML(true);
    $mail->Subject = 'Spybugs POS - Password Reset Request';
    $mail->Body = "
        <h3>Password Reset</h3>
        <p>You requested to reset your admin password.</p>
        <p>Click the link below to set a new password:</p>
        <p><a href=\"{$resetLink}\">{$resetLink}</a></p>
        <p>This link will expire in 1 hour.</p>
    ";
    $mail->AltBody = "Open this link to reset your password (valid for 1 hour): {$resetLink}";

    $mail->send();

    json_response(
        'success',
        'If an account exists, a reset link has been sent to your email.',
        [
            'reset_link' => $resetLink
        ]
    );

} catch (Exception $e) {
    json_response('error', 'Failed to send reset email.', [
        'error' => $e->getMessage()
    ]);
}