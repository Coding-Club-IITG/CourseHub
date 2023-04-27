import 'package:shared_preferences/shared_preferences.dart';

Future<String> getAccessToken() async {
  final prefs = await SharedPreferences.getInstance();
  final token = prefs.getString('access_token');

  if (token != null) {
    return 'Token $token';
  } else {
    return 'error';
  }
}
