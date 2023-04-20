import 'package:flutter/material.dart';


class ExamHeader extends StatelessWidget {
  const ExamHeader({super.key});

  @override
  Widget build(BuildContext context) {
    return Stack(
      alignment: Alignment.topCenter,
      children: [
        Column(
          crossAxisAlignment: CrossAxisAlignment.center,
          children:const [
            Text(
              'Mid-Semester',
              style:
                  TextStyle(color: Colors.black, fontWeight: FontWeight.w400),
            ),
             Text(
              '6 April - 12 April',
              style:
                  TextStyle(color: Colors.black, fontWeight: FontWeight.w400),
            ),
          ],
        ),
        Image.asset(
          'assets/exam_page.png',
          width: double.infinity,
        ),
      ],
    );
  }
}
