import 'package:flutter/material.dart';
import 'screens/login_screen.dart';

void main() {
  runApp(MyApp());
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'POS Joyería',
      debugShowCheckedModeBanner: false, // Quita la rayita roja de "DEBUG"
      theme: ThemeData(
        primarySwatch: Colors.blue,
      ),
      home: LoginScreen(), // ¡Le decimos que inicie en tu pantalla de Login!
    );
  }
}