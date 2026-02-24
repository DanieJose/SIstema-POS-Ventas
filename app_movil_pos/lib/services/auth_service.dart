import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import 'api_config.dart';

class AuthService {
  Future<String?> login(String usuario, String password) async {
    try {
      final response = await http.post(
        Uri.parse('${ApiConfig.baseUrl}/auth/login'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({'usuario': usuario, 'password': password}),
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        final token = data['token'];

        // Guardamos el token de seguridad en la bóveda del celular
        final prefs = await SharedPreferences.getInstance();
        await prefs.setString('jwt_token', token);

        return null; // Retornar "null" significa que no hubo ningún error
      } else {
        final data = jsonDecode(response.body);
        return data['mensaje']; // Retorna el error (ej: "Contraseña incorrecta")
      }
    } catch (e) {
      return 'Error de conexión. Verifica que el servidor Node.js y el Wi-Fi estén encendidos.';
    }
  }
}
