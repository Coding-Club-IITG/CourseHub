import 'package:coursehub/animations/custom_fade_in_animation.dart';
import 'package:coursehub/constants/themes.dart';
import 'package:coursehub/widgets/common/nav_bar.dart';
import 'package:coursehub/widgets/exam_screen.dart/exam_card.dart';
import 'package:coursehub/widgets/exam_screen.dart/exam_header.dart';
import 'package:flutter/material.dart';
import 'package:flutter_staggered_animations/flutter_staggered_animations.dart';

class ExamScreen extends StatelessWidget {
  final Function(int a) returnToPageCallback;
  const ExamScreen({super.key, required this.returnToPageCallback});

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.center,
      children: [
        NavBar(searchCallback: returnToPageCallback),
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
            padding: const EdgeInsets.symmetric(horizontal: 20,vertical: 10),
            child: AnimationLimiter(
              child: ListView.builder(
                physics: const BouncingScrollPhysics(),
                itemCount: 10,
                itemBuilder: (context, index) {
                  return AnimationConfiguration.staggeredList(
                    position: index,
                    duration: const Duration(milliseconds: 375),
                    child: SlideAnimation(
                      verticalOffset: 50.0,
                      child: FadeInAnimation(
                        child: Padding(
                          padding: const EdgeInsets.symmetric(vertical: 8),
                          child: Row(
                            mainAxisAlignment: MainAxisAlignment.start,
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Expanded(
                                flex: 2,
                                child: Column(
                                  mainAxisSize: MainAxisSize.min,
                                  mainAxisAlignment: MainAxisAlignment.start,
                                  children: [
                                    Text('SAT',
                                        style: Themes.darkTextTheme.bodySmall),
                                    const Text(
                                      '11',
                                      style: TextStyle(
                                          color: Colors.black,
                                          fontSize: 32,
                                          fontWeight: FontWeight.w700),
                                    ),
                                    Text('APRIL',
                                        style: Themes.darkTextTheme.bodySmall),
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
                  );
                },
              ),
            ),
          ),
        ),
      ],
    );
  }
}
