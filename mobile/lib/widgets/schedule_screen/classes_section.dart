import 'package:coursehub/widgets/schedule_screen/custom_timeline_tile.dart';
import 'package:flutter/material.dart';
import 'package:flutter_staggered_animations/flutter_staggered_animations.dart';

class ClassesSection extends StatelessWidget {
  const ClassesSection({super.key});

  @override
  Widget build(BuildContext context) {
    return Container(
      height: 250,
      padding: const EdgeInsets.only(left: 24),
      child: AnimationLimiter(
        child: ListView.builder(
          shrinkWrap: true,
          itemCount: 4,
          itemBuilder: (context, index) {
            return AnimationConfiguration.staggeredList(
              position: index,
              duration: const Duration(milliseconds: 375),
              child: SlideAnimation(
                verticalOffset: 50,
                child: FadeInAnimation(
                  child: index == 0
                      ? const CustomTimeLineTile(
                          isFirst: true,
                          isLast: false,
                          isUpcoming: false,
                        )
                      : (index == 3)
                          ? const CustomTimeLineTile(
                              isFirst: false,
                              isLast: true,
                              isUpcoming: true,
                            )
                          : const CustomTimeLineTile(
                              isFirst: false,
                              isLast: false,
                              isUpcoming: true,
                            ),
                ),
              ),
            );
          },
        ),
      ),
    );
  }
}
