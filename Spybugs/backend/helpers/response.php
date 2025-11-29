<?php

if (!function_exists('json_response')) {
    function json_response(array $data, int $statusCode = 200): void
    {
        http_response_code($statusCode);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode($data);
        exit;
    }
}

if (!function_exists('json_success')) {
    function json_success(array $payload = [], string $message = 'OK', int $statusCode = 200): void
    {
        $data = array_merge([
            'status'  => 'success',
            'message' => $message,
        ], $payload);

        json_response($data, $statusCode);
    }
}

if (!function_exists('json_error')) {
    function json_error(string $message = 'Error', int $statusCode = 400, array $extra = []): void
    {
        $data = array_merge([
            'status'  => 'error',
            'message' => $message,
        ], $extra);

        json_response($data, $statusCode);
    }
}
