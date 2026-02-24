import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

class InventarioService {
  // ¡Mantén la misma IP que te ha funcionado!
  static const String baseUrl = 'http://192.168.0.5:3000/api';

  Future<List<dynamic>> obtenerInventario() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final token = prefs.getString('jwt_token');

      if (token == null) return [];

      // Llamamos a la ruta GET /api/inventario que hiciste en Node.js
      final response = await http.get(
        Uri.parse('$baseUrl/inventario'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        // Si tu backend devuelve un arreglo directo o un objeto con los datos, lo extraemos:
        if (data is List) return data;
        if (data is Map) {
          for (var value in data.values) {
            if (value is List) return value; // Busca la lista de productos dentro del JSON
          }
        }
        return [];
      } else {
        return [];
      }
    } catch (e) {
      print('Error al cargar inventario: $e');
      return [];
    }
  }
}