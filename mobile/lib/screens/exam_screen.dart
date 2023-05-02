import 'package:coursehub/animations/custom_fade_in_animation.dart';
import 'package:coursehub/apis/miscellaneous/get_exam_details.dart';
import 'package:coursehub/constants/themes.dart';
import 'package:coursehub/models/exam_details.dart';
import 'package:coursehub/widgets/common/custom_linear_progress.dart';

import 'package:coursehub/widgets/common/nav_bar.dart';
import 'package:coursehub/widgets/exam_screen.dart/exam_card.dart';
import 'package:coursehub/widgets/exam_screen.dart/exam_header.dart';
import 'package:flutter/material.dart';
import 'package:flutter_staggered_animations/flutter_staggered_animations.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';

import '../providers/navigation_provider.dart';

class ExamScreen extends StatelessWidget {
  const ExamScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final navigatorProvider = context.read<NavigationProvider>();
    return WillPopScope(
      onWillPop: () async {
        navigatorProvider.changePageNumber(0);

        return false;
      },
      child: Stack(
        children: [
          const NavBar(),
          Padding(
            padding: const EdgeInsets.only(top: 80),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.center,
              children: [
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
                  child: Container(
                    // transform: Matrix4.translationValues(-10, 0, 0),
                    padding: const EdgeInsets.symmetric(
                        horizontal: 20, vertical: 10),
                    child: FutureBuilder<List<ExamDetails>>(
                      future: getExamDetails(),
                      builder: (context, snapshot) {
                        if (snapshot.hasData) {
                          List<ExamDetails> examDetails = snapshot.data ?? [];
                          return AnimationLimiter(
                            child: ListView.builder(
                              shrinkWrap: true,
                              physics: const BouncingScrollPhysics(),
                              itemCount: examDetails.length,
                              itemBuilder: (context, index) {
                                return AnimationConfiguration.staggeredList(
                                  position: index,
                                  duration: const Duration(milliseconds: 375),
                                  child: SlideAnimation(
                                    verticalOffset: 50.0,
                                    child: FadeInAnimation(
                                      child: Padding(
                                        padding: const EdgeInsets.symmetric(
                                            vertical: 8),
                                        child: Row(
                                          mainAxisAlignment:
                                              MainAxisAlignment.start,
                                          crossAxisAlignment:
                                              CrossAxisAlignment.start,
                                          children: [
                                            !(index > 0 &&
                                                    examDetails[index].date ==
                                                        examDetails[index - 1]
                                                            .date)
                                                ? Expanded(
                                                    flex: 2,
                                                    child: Column(
                                                      mainAxisSize:
                                                          MainAxisSize.min,
                                                      mainAxisAlignment:
                                                          MainAxisAlignment
                                                              .start,
                                                      children: [
                                                        Text(
                                                            DateFormat('EEE')
                                                                .format(
                                                                    examDetails[
                                                                            index]
                                                                        .date)
                                                                .toUpperCase(),
                                                            style: Themes
                                                                .darkTextTheme
                                                                .bodySmall),
                                                        Text(
                                                          examDetails[index]
                                                              .date
                                                              .day
                                                              .toString(),
                                                          style: const TextStyle(
                                                              color:
                                                                  Colors.black,
                                                              fontSize: 32,
                                                              fontWeight:
                                                                  FontWeight
                                                                      .w700),
                                                        ),
                                                        Text(
                                                            DateFormat('MMM')
                                                                .format(
                                                                    examDetails[
                                                                            index]
                                                                        .date)
                                                                .toUpperCase(),
                                                            style: Themes
                                                                .darkTextTheme
                                                                .bodySmall),
                                                      ],
                                                    ),
                                                  )
                                                : const Spacer(
                                                    flex: 2,
                                                  ),
                                            Expanded(
                                              flex: 8,
                                              child: ExamCard(
                                                exam: examDetails[index],
                                              ),
                                            ),
                                          ],
                                        ),
                                      ),
                                    ),
                                  ),
                                );
                              },
                            ),
                          );
                        } else if (snapshot.connectionState ==
                            ConnectionState.waiting) {
                          return const CustomLinearProgress(
                              text: 'Loading your exam details!');
                        } else {
                          return const Center(
                            child: Text(
                              'No data Found !',
                              style: TextStyle(color: Colors.black),
                            ),
                          );
                        }
                      },
                    ),
                  ),
                )
              ],
            ),
          ),
        ],
      ),
    );
  }
}
