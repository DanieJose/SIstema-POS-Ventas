import 'package:flutter/material.dart';
import 'package:mobile_scanner/mobile_scanner.dart';
import '../services/inventario_service.dart';
import '../services/ventas_service.dart';
import 'recibo_screen.dart'; // Importamos la nueva pantalla de recibo

class CarritoScreen extends StatefulWidget {
  const CarritoScreen({super.key});

  @override
  State<CarritoScreen> createState() => _CarritoScreenState();
}

class _CarritoScreenState extends State<CarritoScreen> {
  final InventarioService _inventarioService = InventarioService();
  final VentasService _ventasService = VentasService();
  
  List<dynamic> _inventarioCompleto = [];
  final List<Map<String, dynamic>> _carrito = [];
  double _total = 0.0;
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _cargarInventarioParaEscaner();
  }

  // Descargamos el inventario una sola vez para que el escáner sea rapidísimo
  void _cargarInventarioParaEscaner() async {
    final productos = await _inventarioService.obtenerInventario();
    setState(() {
      _inventarioCompleto = productos;
      _isLoading = false;
    });
  }

  // Función que abre la cámara y busca el producto
  Future<void> _escanearParaCarrito() async {
    try {
      final codigoEscaneado = await Navigator.of(context).push<String>(
        MaterialPageRoute(builder: (_) => const _BarcodeScannerPage()),
      );

      if (!mounted) return;

      if (codigoEscaneado != null && codigoEscaneado.isNotEmpty) {
        // Buscamos el producto en nuestro inventario descargado
        final productoEncontrado = _inventarioCompleto.firstWhere(
          (prod) => prod['codigo_barras'] == codigoEscaneado,
          orElse: () => null,
        );

        if (productoEncontrado != null) {
          _agregarAlCarrito(productoEncontrado);
        } else {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('Código no encontrado: $codigoEscaneado'), backgroundColor: Colors.red),
          );
        }
      }
    } catch (e) {
      print('Error al escanear: $e');
    }
  }

  // Lógica para agregar a la lista y sumar el total
  void _agregarAlCarrito(dynamic producto) {
    setState(() {
      // Verificamos si el producto ya está en el carrito para solo sumarle 1 a la cantidad
      int index = _carrito.indexWhere((item) => item['codigo_barras'] == producto['codigo_barras']);
      
      if (index != -1) {
        _carrito[index]['cantidad'] += 1;
      } else {
        // Si no está, lo agregamos como nuevo
        _carrito.add({
          'variante_id': producto['variante_id'] ?? producto['id_articulo'] ?? producto['id_producto'] ?? producto['id'],
          // Ajuste del ID para que coincida con tu base de datos
          'id': producto['id_articulo'] ?? producto['id_producto'] ?? producto['id'], 
          'codigo_barras': producto['codigo_barras'],
          'nombre': producto['nombre'] ?? producto['producto'] ?? 'Joya',
          'precio': double.parse((producto['precio_venta'] ?? producto['precio'] ?? 0).toString()),
          'cantidad': 1,
        });
      }
      _calcularTotal();
    });
  }

  void _eliminarDelCarrito(int index) {
    setState(() {
      _carrito.removeAt(index);
      _calcularTotal();
    });
  }

  void _calcularTotal() {
    double nuevoTotal = 0;
    for (var item in _carrito) {
      nuevoTotal += (item['precio'] * item['cantidad']);
    }
    _total = nuevoTotal;
  }

  // Procesar Venta y saltar al Recibo
  void _procesarVenta() async {
    // Mostramos una ruedita de carga para que el usuario espere
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) => Center(child: CircularProgressIndicator()),
    );

    // Enviamos el carrito y el total al servidor
    final exito = await _ventasService.registrarVenta(_carrito, _total);

    Navigator.pop(context); // Ocultamos la ruedita de carga

    if (exito) {
      // 1. Guardamos una copia temporal de los datos para dárselos al recibo
      final copiaCarrito = List<Map<String, dynamic>>.from(_carrito);
      final copiaTotal = _total;
      
      // 2. Limpiamos el carrito real para el siguiente cliente
      setState(() {
        _carrito.clear();
        _total = 0.0;
      });

      // 3. Mostramos el mensaje verde
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('¡Venta registrada en la base de datos!'), backgroundColor: Colors.green),
      );

      // 4. ¡Teletransportación a la pantalla del Ticket!
      Navigator.push(
        context,
        MaterialPageRoute(
          builder: (context) => ReciboScreen(
            carrito: copiaCarrito,
            total: copiaTotal,
          ),
        ),
      );
    } else {
      // Mensaje de error
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Error al procesar el pago. Revisa el servidor.'), backgroundColor: Colors.red),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.grey[100],
      appBar: AppBar(
        title: Text('Nueva Venta', style: TextStyle(color: Colors.white)),
        backgroundColor: Colors.blue[800],
        iconTheme: IconThemeData(color: Colors.white),
        actions: [
          // Botón mágico de prueba temporal
          IconButton(
            icon: Icon(Icons.add_shopping_cart), 
            onPressed: () {
              if (_inventarioCompleto.isNotEmpty) {
                _agregarAlCarrito(_inventarioCompleto[0]); 
              }
            },
          ),
          // Botón de escáner real
          IconButton(
            icon: Icon(Icons.qr_code_scanner),
            onPressed: _escanearParaCarrito,
            tooltip: 'Escanear Producto',
          )
        ],
      ),
      body: _isLoading
          ? Center(child: CircularProgressIndicator())
          : _carrito.isEmpty
              ? Center(
                  child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(Icons.shopping_cart_outlined, size: 100, color: Colors.grey[400]),
                    SizedBox(height: 16),
                    Text('El carrito está vacío', style: TextStyle(fontSize: 18, color: Colors.grey[600])),
                    Text('Presiona el icono del escáner arriba', style: TextStyle(color: Colors.grey[500])),
                  ],
                ))
              : ListView.builder(
                  padding: EdgeInsets.only(bottom: 100, top: 10, left: 10, right: 10),
                  itemCount: _carrito.length,
                  itemBuilder: (context, index) {
                    final item = _carrito[index];
                    return Card(
                      child: ListTile(
                        leading: CircleAvatar(
                          backgroundColor: Colors.blue[100],
                          child: Text('${item['cantidad']}x', style: TextStyle(color: Colors.blue[800], fontWeight: FontWeight.bold)),
                        ),
                        title: Text(item['nombre'], style: TextStyle(fontWeight: FontWeight.bold)),
                        subtitle: Text('L. ${item['precio']} c/u'),
                        trailing: IconButton(
                          icon: Icon(Icons.delete, color: Colors.red[300]),
                          onPressed: () => _eliminarDelCarrito(index),
                        ),
                      ),
                    );
                  },
                ),
                
      // Barra inferior con el Total y el Botón de Cobrar
      bottomSheet: Container(
        padding: EdgeInsets.all(20),
        decoration: BoxDecoration(
          color: Colors.white,
          boxShadow: [BoxShadow(color: Colors.black12, blurRadius: 10, offset: Offset(0, -5))],
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Total a Pagar:', style: TextStyle(color: Colors.grey[600])),
                Text('L. ${_total.toStringAsFixed(2)}', style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold, color: Colors.green[700])),
              ],
            ),
            ElevatedButton.icon(
              onPressed: _carrito.isEmpty ? null : _procesarVenta, // ¡Conectado a la función final!
              icon: Icon(Icons.payments, color: Colors.white),
              label: Text('COBRAR', style: TextStyle(fontSize: 18, color: Colors.white)),
              style: ElevatedButton.styleFrom(
                padding: EdgeInsets.symmetric(horizontal: 24, vertical: 12),
                backgroundColor: Colors.blue[800],
                disabledBackgroundColor: Colors.grey[300],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _BarcodeScannerPage extends StatefulWidget {
  const _BarcodeScannerPage();

  @override
  State<_BarcodeScannerPage> createState() => _BarcodeScannerPageState();
}

class _BarcodeScannerPageState extends State<_BarcodeScannerPage> {
  final MobileScannerController _controller = MobileScannerController();
  bool _handledResult = false;

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  void _onDetect(BarcodeCapture capture) {
    if (_handledResult) return;
    for (final barcode in capture.barcodes) {
      final value = barcode.rawValue;
      if (value != null && value.isNotEmpty) {
        _handledResult = true;
        Navigator.of(context).pop(value);
        return;
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text('Escanear producto'),
        actions: [
          IconButton(
            onPressed: () => Navigator.of(context).pop(),
            icon: Icon(Icons.close),
          ),
        ],
      ),
      body: MobileScanner(
        controller: _controller,
        onDetect: _onDetect,
      ),
    );
  }
}
