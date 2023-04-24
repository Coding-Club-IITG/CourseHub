import 'package:coursehub/animations/custom_fade_in_animation.dart';
import 'package:coursehub/apis/miscellaneous/get_exam_details.dart';
import 'package:coursehub/constants/themes.dart';
import 'package:coursehub/models/exam_details.dart';
import 'package:coursehub/screens/DUMMYDATA.dart';

import 'package:coursehub/widgets/common/custom_linear_progress.dart';
import 'package:coursehub/widgets/common/nav_bar.dart';
import 'package:coursehub/widgets/exam_screen.dart/exam_card.dart';
import 'package:coursehub/widgets/exam_screen.dart/exam_header.dart';
import 'package:flutter/material.dart';
import 'package:flutter_staggered_animations/flutter_staggered_animations.dart';


class ExamScreen extends StatelessWidget {
  const ExamScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.center,
      children: [
        const NavBar(),
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
        const CustomFadeInAnimation(
          child: ExamHeader(),
        ),
        const SizedBox(
          height: 20,
        ),
        Expanded(
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
            child: AnimationLimiter(
              child: FutureBuilder<List<ExamDetails>>(
                  future: getExamDetails(),
                  builder: (context, snapshot) {
                    if (snapshot.hasData) {
                      return ListView.builder(
                        physics: const BouncingScrollPhysics(),
                        itemCount: dummyData.length,
                        itemBuilder: (context, index) {
                          var data = dummyData[index];

                          return AnimationConfiguration.staggeredList(
                            position: index,
                            duration: const Duration(milliseconds: 375),
                            child: SlideAnimation(
                              verticalOffset: 50.0,
                              child: FadeInAnimation(
                                child: Padding(
                                  padding:
                                      const EdgeInsets.symmetric(vertical: 8),
                                  child: Row(
                                    mainAxisAlignment: MainAxisAlignment.start,
                                    crossAxisAlignment:
                                        CrossAxisAlignment.start,
                                    children: [
                                      Expanded(
                                        flex: 2,
                                        child: Column(
                                          mainAxisSize: MainAxisSize.min,
                                          mainAxisAlignment:
                                              MainAxisAlignment.start,
                                          children: [
                                            Text(data['day'] ?? '',
                                                style: Themes
                                                    .darkTextTheme.bodySmall),
                                            Text(
                                              data['date'] ?? '',
                                              style: const TextStyle(
                                                  color: Colors.black,
                                                  fontSize: 32,
                                                  fontWeight: FontWeight.w700),
                                            ),
                                            Text(data['month'] ?? '',
                                                style: Themes
                                                    .darkTextTheme.bodySmall),
                                          ],
                                        ),
                                      ),
                                      Expanded(
                                        flex: 8,
                                        child: ExamCard(
                                          exam: data,
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                              ),
                            ),
                          );
                        },
                      );
                    } else {
                      return const CustomLinearProgress(
                          text: 'Loading your exam details !');
                    }
                  }),
            ),
          ),
        ),
      ],
    );
  }
}
