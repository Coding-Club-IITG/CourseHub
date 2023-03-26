import 'dart:convert';

import 'package:http/http.dart' as http;

import '../../constants/endpoints.dart';
import '../protected.dart';


Future<String> getPreviewLink(String id) async {
  final token = await getAccessToken();
  if (token == 'error') {
    throw ('token not found');
  }
  try {
    final res = await http.get(
      Uri.parse('${FileEndpoints.preview}$id'),
      headers: {"Authorization": token},
    );

    return jsonDecode(res.body)['url'];
  } catch (e) {
    rethrow;
  }
}
