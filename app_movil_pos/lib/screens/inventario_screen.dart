import 'package:flutter/material.dart';
import 'package:mobile_scanner/mobile_scanner.dart';
import '../services/inventario_service.dart';

class InventarioScreen extends StatefulWidget {
  const InventarioScreen({super.key});

  @override
  _InventarioScreenState createState() => _InventarioScreenState();
}

class _InventarioScreenState extends State<InventarioScreen> {
  final InventarioService _inventarioService = InventarioService();
  List<dynamic> _productos = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _cargarProductos();
  }

  void _cargarProductos() async {
    final productos = await _inventarioService.obtenerInventario();
    setState(() {
      _productos = productos;
      _isLoading = false;
    });
  }

  Future<void> _escanearCodigo() async {
    try {
      final codigoEscaneado = await Navigator.of(context).push<String>(
        MaterialPageRoute(
          builder: (_) => const _BarcodeScannerPage(),
        ),
      );

      // Si el usuario no canceló (el sistema devuelve '-1' si cancela)
      if (codigoEscaneado != null && codigoEscaneado.isNotEmpty) {
        
        // 2. Buscar el código de barras en nuestra lista de productos de MySQL
        final productoEncontrado = _productos.firstWhere(
          (prod) => prod['codigo_barras'] == codigoEscaneado,
          orElse: () => null, // Si no lo encuentra, devuelve null
        );

        // 3. Mostrar el resultado en pantalla
        if (productoEncontrado != null) {
          _mostrarAlerta(
            '¡Producto Encontrado!', 
            '${productoEncontrado['nombre']} - L. ${productoEncontrado['precio_venta']}\nStock: ${productoEncontrado['stock_actual']}',
            Colors.green
          );
        } else {
          _mostrarAlerta(
            'No Encontrado', 
            'El código $codigoEscaneado no existe en tu inventario.',
            Colors.red
          );
        }
      }
    } catch (e) {
      _mostrarAlerta('Error', 'No se pudo abrir la cámara.', Colors.red);
    }
  }

  // Función auxiliar para dibujar un cuadrito de alerta bonito
  void _mostrarAlerta(String titulo, String mensaje, Color color) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Text(titulo, style: TextStyle(color: color, fontWeight: FontWeight.bold)),
        content: Text(mensaje, style: TextStyle(fontSize: 16)),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: Text('OK', style: TextStyle(color: Colors.blue[800])),
          )
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.grey[100],
      appBar: AppBar(
        title: Text('Inventario', style: TextStyle(color: Colors.white)),
        backgroundColor: Colors.blue[800],
        iconTheme: IconThemeData(color: Colors.white),
      ),
        // ¡AGREGAR ESTO AQUÍ!
      floatingActionButton: FloatingActionButton.extended(
        onPressed: _escanearCodigo,
        backgroundColor: Colors.blue[800],
        icon: Icon(Icons.qr_code_scanner, color: Colors.white),
        label: Text('Escanear', style: TextStyle(color: Colors.white)),
      ),

      body: _isLoading
          ? Center(child: CircularProgressIndicator())
          : _productos.isEmpty
              ? Center(child: Text('No hay productos en el inventario.', style: TextStyle(fontSize: 18)))
              : ListView.builder(
                  padding: EdgeInsets.all(12),
                  itemCount: _productos.length,
                  itemBuilder: (context, index) {
                    final item = _productos[index];
                    // Adaptamos los nombres según cómo los programaste en MySQL
                    final nombre = item['nombre'] ?? item['producto'] ?? 'Producto sin nombre';
                    final stock = item['stock_actual'] ?? item['stock'] ?? 0;
                    final precio = item['precio_venta'] ?? item['precio'] ?? '0.00';
                    final color = item['color'] ?? ''; // Por si es ropa o joyería con variantes

                    return Card(
                      elevation: 2,
                      margin: EdgeInsets.symmetric(vertical: 8),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                      child: ListTile(
                        leading: CircleAvatar(
                          backgroundColor: Colors.blue[100],
                          child: Icon(Icons.diamond, color: Colors.blue[800]), // ¡Un diamante para la joyería!
                        ),
                        title: Text(nombre, style: TextStyle(fontWeight: FontWeight.bold)),
                        subtitle: Text('Stock: $stock unidades ${color != '' ? '• $color' : ''}'),
                        trailing: Text(
                          'L. $precio',
                          style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Colors.green[700]),
                        ),
                      ),
                    );
                  },
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
        title: const Text('Escanear código'),
        actions: [
          IconButton(
            onPressed: () => Navigator.of(context).pop(),
            icon: const Icon(Icons.close),
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
