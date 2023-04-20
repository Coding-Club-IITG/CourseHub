import 'package:coursehub/constants/themes.dart';
import 'package:coursehub/widgets/common/nav_bar.dart';
import 'package:coursehub/widgets/exam_screen.dart/exam_card.dart';
import 'package:coursehub/widgets/exam_screen.dart/exam_header.dart';
import 'package:flutter/material.dart';

class ExamScreen extends StatelessWidget {
  const ExamScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.center,
      
      children: [
        NavBar(searchCallback: (int a) {}),
        const SizedBox(
          height: 20,
        ),
        const Text(
          'Exam Schedule',
          style: TextStyle(color: Colors.black, fontSize: 24),
        ),
        const SizedBox(
          height: 10,
        ),
        const ExamHeader(),
        const SizedBox(
          height: 20,
        ),
        Expanded(
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 20,vertical: 10),
            child: ListView.builder(
              itemCount: 10,
              itemBuilder: (context, index) => Row(
                mainAxisAlignment: MainAxisAlignment.start,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Expanded(
                    flex: 2,
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      mainAxisAlignment: MainAxisAlignment.start,
                      children: [
                        Text('SAT', style: Themes.darkTextTheme.bodySmall),
                        const Text(
                          '11',
                          style: TextStyle(
                              color: Colors.black,
                              fontSize: 32,
                              fontWeight: FontWeight.w700),
                        ),
                        Text('APRIL', style: Themes.darkTextTheme.bodySmall),

                      ],
                    ),
                  ),
                  const Expanded(
                    flex: 8,
                    child: ExamCard(),
                  ),
                ],
              ),
            ),
          ),
        ),
      ],
    );
  }
}
