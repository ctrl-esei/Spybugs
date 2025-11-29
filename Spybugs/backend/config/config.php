<?php

$host     = "localhost";     
$dbname   = "spybugs_pos";    
$username = "root";         
$password = "";              

try {
    $dsn = "mysql:host=$host;dbname=$dbname;charset=utf8mb4";

    $options = [
        PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION, 
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,      
        PDO::ATTR_EMULATE_PREPARES   => false,                 
        PDO::MYSQL_ATTR_INIT_COMMAND => "SET NAMES utf8mb4"   
    ];

    $pdo = new PDO($dsn, $username, $password, $options);

} catch (PDOException $e) {
    die("Database connection failed: " . $e->getMessage());
}