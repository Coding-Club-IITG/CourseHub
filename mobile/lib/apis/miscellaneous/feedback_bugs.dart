import 'dart:convert';
import 'dart:io';

import 'package:http/http.dart' as http;

import '../../apis/protected.dart';
import '../../constants/endpoints.dart';

Future<void> postFeedbackBugs(
    String description, List<File?> screenshots, bool isFeedback) async {
  final header = await getAccessToken();

  if (header == 'error') {
    throw 'aceess token not found';
  }

  try {
    final request = http.MultipartRequest(
        'POST', Uri.parse(MiscellaneousEndpoints.postFeedbackBug));

    request.headers['authorization'] = header;
    request.fields['description'] = description;
    request.fields['category'] = isFeedback ? 'FEEDBACK' : 'BUG';

    for (var file in screenshots) {
      http.MultipartFile multipartFile =
          await http.MultipartFile.fromPath('screenshots', file!.path);
      request.files.add(multipartFile);
    }
    final response = await request.send();

    final res = await http.Response.fromStream(response);

    if (jsonDecode(res.body)['success'] == false) {
      throw jsonDecode(res.body)['message'];
    }

  } catch (e) {
    rethrow;
  }
}
