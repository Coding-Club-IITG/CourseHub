import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';

String examDate = "Unknown";
String examType = "Exam";

class ExamHeader extends StatelessWidget {
  const ExamHeader({super.key});
  Future<void> setExamDates() async {
    final prefs = await SharedPreferences.getInstance();
    examDate = prefs.getString("examDate") ?? examDate;
    examType = prefs.getString("examType") ?? examType;
  }

  @override
  Widget build(BuildContext context) {
    return Stack(
      alignment: Alignment.topCenter,
      children: [
        FutureBuilder<void>(
            future: setExamDates(),
            builder: (context, snapshot) {
              return Column(
                crossAxisAlignment: CrossAxisAlignment.center,
                children: [
                  Text(
                    examType,
                    style: const TextStyle(
                      color: Colors.black,
                      fontWeight: FontWeight.w400,
                    ),
                  ),
                  const SizedBox(
                    height: 2,
                  ),
                  Text(
                    examDate,
                    style: const TextStyle(
                        color: Colors.black, fontWeight: FontWeight.w400),
                  ),
                ],
              );
            }),
        Image.asset(
          'assets/exam_page.png',
          width: double.infinity,
        ),
      ],
    );
  }
}
