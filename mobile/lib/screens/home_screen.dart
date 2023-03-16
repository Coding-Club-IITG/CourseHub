import 'package:coursehub/animations/fade_in_animation.dart';
import 'package:flutter/material.dart';
import '../constants/themes.dart';
import '../database/hive_store.dart';
import '../widgets/home_screen/course_card.dart';

class HomeScreen extends StatelessWidget {
  final Function(String code) setBrowseCourseCodeCallback;
  final Function(int a) returnToPageCallback;
  const HomeScreen(
      {super.key,
      required this.setBrowseCourseCodeCallback,
      required this.returnToPageCallback});

  @override
  Widget build(BuildContext context) {
    final user = HiveStore.getUserDetails();

    return Container(
      color: Colors.black,
      child: CustomFadeInAnimation(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 0.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  const SizedBox(
                    width: 26.0,
                  ),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          "Welcome,",
                          style: Themes.theme.textTheme.displaySmall,
                        ),
                        Text(
                          user.name,
                          style: Themes.theme.textTheme.bodyLarge,
                        ),
                      ],
                    ),
                  ),
                  Image.asset(
                    "assets/home_books.png",
                    width: 140,
                  ),
                ],
              ),
              const SizedBox(
                height: 26.0,
              ),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 26.0),
                child: Text("MY COURSES",
                    style: Themes.theme.textTheme.bodyMedium),
              ),
              Expanded(
                child: Padding(
                  padding: const EdgeInsets.symmetric(
                      horizontal: 26.0, vertical: 19.0),
                  child: GridView.count(
                    physics: const BouncingScrollPhysics(),
                    crossAxisCount: 2,
                    crossAxisSpacing: 23.0,
                    mainAxisSpacing: 16.0,
                    childAspectRatio: 1.25,
                    shrinkWrap: true,
                    children: user.courses.map(
                      (e) {
                        return CourseCard(
                          course: e,
                          setBrowseCourseCodeCallback:
                              setBrowseCourseCodeCallback,
                          returnToPageCallback: returnToPageCallback,
                        );
                      },
                    ).toList(),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
