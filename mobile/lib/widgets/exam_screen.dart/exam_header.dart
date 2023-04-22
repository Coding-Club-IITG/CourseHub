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
          children: [
            const Text(
              'Mid-Semester',
              style:
                  TextStyle(color: Colors.black, fontWeight: FontWeight.w400),
            ),
            const SizedBox(height: 2,),
            RichText(
              text: TextSpan(
                children: [
                  const TextSpan(
                    text: '26',
                    style: TextStyle(color: Colors.black),
                  ),
                  WidgetSpan(
                    child: Transform.translate(
                      offset: const Offset(0, -4),
                      child: const Text(
                        'th',
                        //superscript is usually smaller in size
                        textScaleFactor: 0.7,
                        style: TextStyle(fontSize: 14, color: Colors.black),
                      ),
                    ),
                  ),
                  const TextSpan(
                    text: ' Feb - ',
                    style: TextStyle(color: Colors.black),
                  ),
                  const TextSpan(
                    text: '4',
                    style: TextStyle(color: Colors.black),
                  ),
                  WidgetSpan(
                    child: Transform.translate(
                      offset: const Offset(0, -4),
                      child: const Text(
                        'th',
                        //superscript is usually smaller in size
                        textScaleFactor: 0.7,
                        style: TextStyle(fontSize: 14, color: Colors.black),
                      ),
                    ),
                  ),
                  const TextSpan(
                    text: ' Mar',
                    style: TextStyle(color: Colors.black),
                  ),
                ],
              ),
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
