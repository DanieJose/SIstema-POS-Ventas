import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

class VentasService {
  // Mantenemos tu IP local
  static const String baseUrl = 'http://192.168.0.5:3000/api';

  Future<bool> registrarVenta(List<Map<String, dynamic>> carrito, double total) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final token = prefs.getString('jwt_token');

      if (token == null) return false;

      // 1. Empaquetamos el carrito en el formato JSON que espera Node.js
      final body = jsonEncode({
        'cliente_id': 1, // Usamos 1 para "Consumidor Final" por defecto
        'metodo_pago': 'efectivo',
        'detalles': carrito.map((item) => {
          'variante_id': item['variante_id'] ?? item['id'],
          'cantidad': item['cantidad'],
          'precio_unitario': item['precio']
        }).toList(),
      });

      // 2. Hacemos la petición POST a tu servidor
      final response = await http.post(
        Uri.parse('$baseUrl/ventas'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
        body: body,
      );

      // 3. Verificamos si Node.js y MySQL aceptaron la venta (201 Creado o 200 OK)
      if (response.statusCode == 201 || response.statusCode == 200) {
        return true; // ¡Éxito!
      } else {
        print('Error del servidor: ${response.body}');
        return false;
      }
    } catch (e) {
      print('Error de conexión: $e');
      return false;
    }
  }
}
