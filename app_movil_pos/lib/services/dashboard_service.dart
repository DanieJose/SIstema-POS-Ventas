import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import 'api_config.dart';

class DashboardService {
  Future<Map<String, dynamic>?> obtenerResumen() async {
    try {
      // 1. Sacamos la "llave maestra" (Token) de la bóveda del celular
      final prefs = await SharedPreferences.getInstance();
      final token = prefs.getString('jwt_token');

      if (token == null) return null; // Si no hay token, no podemos pasar

      // 2. Tocamos la puerta del servidor mostrando el Token
      final response = await http.get(
        Uri.parse('${ApiConfig.baseUrl}/reportes/dashboard'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
      );

      // 3. Si el servidor nos deja entrar (200 OK), leemos los datos
      if (response.statusCode == 200) {
        return jsonDecode(response.body);
      } else {
        return null; // El token expiró o es inválido
      }
    } catch (e) {
      print('Error de red: $e');
      return null;
    }
  }
}
