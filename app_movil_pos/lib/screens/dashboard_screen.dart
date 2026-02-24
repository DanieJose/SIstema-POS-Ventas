import 'package:flutter/material.dart';
import '../services/dashboard_service.dart';
import 'inventario_screen.dart';
import 'carrito_screen.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'login_screen.dart';

class DashboardScreen extends StatefulWidget {
  const DashboardScreen({super.key});

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  final DashboardService _dashboardService = DashboardService();
  Map<String, dynamic>? _datosDashboard;
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _cargarDatos();
  }

  Future<void> _cargarDatos() async {
    try {
      final datos = await _dashboardService.obtenerResumen();
      if (!mounted) return;
      setState(() {
        _datosDashboard = datos;
        _isLoading = false;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _datosDashboard = null;
        _isLoading = false;
      });
    }
  }

  Future<void> _cerrarSesion() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('jwt_token');

    if (!mounted) return;
    Navigator.pushAndRemoveUntil(
      context,
      MaterialPageRoute(builder: (_) => const LoginScreen()),
      (route) => false,
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.grey[100],
      appBar: AppBar(
        title: const Text('Panel de Control', style: TextStyle(color: Colors.white)),
        backgroundColor: Colors.blue[800],
        iconTheme: const IconThemeData(color: Colors.white),
      ),

      drawer: Drawer(
        child: ListView(
          padding: EdgeInsets.zero,
          children: [
            DrawerHeader(
              decoration: BoxDecoration(color: Colors.blue[800]),
              child: const Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(Icons.storefront, size: 60, color: Colors.white),
                  SizedBox(height: 10),
                  Text('Sistema POS', style: TextStyle(color: Colors.white, fontSize: 24)),
                ],
              ),
            ),

            ListTile(
              leading: Icon(Icons.dashboard, color: Colors.grey[700]),
              title: const Text('Panel de Control'),
              onTap: () => Navigator.pop(context),
            ),

            ListTile(
              leading: Icon(Icons.inventory_2, color: Colors.grey[700]),
              title: const Text('Inventario'),
              onTap: () {
                Navigator.pop(context);
                Navigator.push(
                  context,
                  MaterialPageRoute(builder: (_) => const InventarioScreen()),
                );
              },
            ),

            ListTile(
              leading: Icon(Icons.point_of_sale, color: Colors.green[700]),
              title: const Text(
                'Nueva Venta (POS)',
                style: TextStyle(fontWeight: FontWeight.bold),
              ),
              onTap: () async {
                Navigator.pop(context);
                await Navigator.push(
                  context,
                  MaterialPageRoute(builder: (_) => const CarritoScreen()),
                );
                _cargarDatos();
              },
            ),

            const Divider(thickness: 1),

            ListTile(
              leading: Icon(Icons.logout, color: Colors.red[400]),
              title: Text(
                'Cerrar Sesión',
                style: TextStyle(color: Colors.red[700], fontWeight: FontWeight.bold),
              ),
              onTap: _cerrarSesion,
            ),
          ],
        ),
      ),

      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : _datosDashboard == null
              ? const Center(child: Text('Error al cargar datos. Verifica tu conexión.'))
              : Padding(
                  padding: const EdgeInsets.all(16.0),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'Resumen Financiero',
                        style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold),
                      ),
                      const SizedBox(height: 16),

                      Card(
                        elevation: 3,
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                        child: ListTile(
                          leading: CircleAvatar(
                            backgroundColor: Colors.green[100],
                            child: const Icon(Icons.attach_money, color: Colors.green),
                          ),
                          title: const Text('Ingresos de Hoy', style: TextStyle(fontWeight: FontWeight.bold)),
                          subtitle: Text('${_datosDashboard!['resumen_hoy']['facturas_emitidas']} facturas emitidas'),
                          trailing: Text(
                            _datosDashboard!['resumen_hoy']['total_ingresos'].toString(),
                            style: TextStyle(
                              fontSize: 20,
                              fontWeight: FontWeight.bold,
                              color: Colors.green[700],
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(height: 12),

                      Card(
                        elevation: 3,
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                        child: ListTile(
                          leading: CircleAvatar(
                            backgroundColor: Colors.orange[100],
                            child: const Icon(Icons.shopping_bag, color: Colors.orange),
                          ),
                          title: const Text('Dinero en Apartados', style: TextStyle(fontWeight: FontWeight.bold)),
                          subtitle: Text('${_datosDashboard!['apartados']['activos']} apartados pendientes'),
                          trailing: Text(
                            _datosDashboard!['apartados']['dinero_pendiente'].toString(),
                            style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
    );
  }
}