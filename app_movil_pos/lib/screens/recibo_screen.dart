import 'package:flutter/material.dart';

class ReciboScreen extends StatelessWidget {
  final List<Map<String, dynamic>> carrito;
  final double total;

  // El constructor exige que le pasemos el carrito y el total
  const ReciboScreen({super.key, required this.carrito, required this.total});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.grey[200],
      appBar: AppBar(
        title: Text('Recibo de Compra', style: TextStyle(color: Colors.white)),
        backgroundColor: Colors.blue[800],
        iconTheme: IconThemeData(color: Colors.white),
        automaticallyImplyLeading: false, // Quitamos la flecha de atrás para obligar a usar el botón
      ),
      body: Center(
        child: Container(
          margin: EdgeInsets.all(20),
          padding: EdgeInsets.all(24),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(12),
            boxShadow: [BoxShadow(color: Colors.black12, blurRadius: 15, offset: Offset(0, 5))],
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.center,
            children: [
              Icon(Icons.check_circle, color: Colors.green[600], size: 70),
              SizedBox(height: 12),
              Text('¡Venta Exitosa!', style: TextStyle(fontSize: 26, fontWeight: FontWeight.bold)),
              Text('Sistema POS - Joyería', style: TextStyle(color: Colors.grey[600], fontSize: 16)),
              SizedBox(height: 20),
              
              // Línea punteada decorativa
              Text('- - - - - - - - - - - - - - - - - - - - - - - - - -', style: TextStyle(color: Colors.grey[400])),
              SizedBox(height: 10),

              // Dibujamos cada producto que venía en el carrito
              ...carrito.map((item) {
                double subtotal = item['precio'] * item['cantidad'];
                return Padding(
                  padding: const EdgeInsets.symmetric(vertical: 6.0),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Expanded(
                        child: Text('${item['cantidad']}x ${item['nombre']}', style: TextStyle(fontSize: 16)),
                      ),
                      Text('L. ${subtotal.toStringAsFixed(2)}', style: TextStyle(fontSize: 16)),
                    ],
                  ),
                );
              }),

              SizedBox(height: 10),
              Text('- - - - - - - - - - - - - - - - - - - - - - - - - -', style: TextStyle(color: Colors.grey[400])),
              SizedBox(height: 15),

              // Total
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text('TOTAL PAGADO:', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                  Text(
                    'L. ${total.toStringAsFixed(2)}', 
                    style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold, color: Colors.green[700])
                  ),
                ],
              ),
              
              SizedBox(height: 30),
              
              // Botón para cerrar el recibo y atender a otro cliente
              ElevatedButton.icon(
                onPressed: () => Navigator.pop(context), // Regresa al carrito vacío
                icon: Icon(Icons.shopping_cart, color: Colors.white),
                label: Text('NUEVA VENTA', style: TextStyle(color: Colors.white, fontSize: 16)),
                style: ElevatedButton.styleFrom(
                  backgroundColor: Colors.blue[800],
                  minimumSize: Size(double.infinity, 50),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                ),
              )
            ],
          ),
        ),
      ),
    );
  }
}