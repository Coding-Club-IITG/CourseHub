import 'dart:convert';
import 'package:hive/hive.dart';
import '../../constants/endpoints.dart';
import 'package:http/http.dart' as http;
import '../protected.dart';

Future<void> getCurrentUser() async {
  final header = await getAccessToken();

  if (header == 'error') {
    throw ('token not found');
  }
  try {
    final resp = await http.get(
      Uri.parse(UserEndpoints.currentUser),
      headers: {"Authorization": header},
    );

    final body = jsonDecode(resp.body);


    var box = await Hive.openBox('coursehub-data');
    box.put('user', body);
  } catch (e) {
    rethrow;
  }
}
