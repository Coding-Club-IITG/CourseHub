import 'package:coursehub/database/cache_store.dart';
import 'package:coursehub/providers/navigation_provider.dart';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../apis/courses/course_availability.dart';
import '../../constants/themes.dart';
import '../../utilities/letter_capitalizer.dart';
import '../../models/course.dart';

class CourseCard extends StatelessWidget {
  final Course course;

  const CourseCard({
    super.key,
    required this.course,
  });

  @override
  Widget build(BuildContext context) {
    final navigationProvider = context.read<NavigationProvider>();

    return FutureBuilder<bool>(
      future: isCourseAvailable(course.code),
      builder: (context, snapshot) {
        if (snapshot.hasData) {
          return InkWell(
            child: Ink(
              child: AvailableCard(
                course: course,
                isAvailable: snapshot.data ?? false,
              ),
            ),
            onTap: () {
              if (snapshot.data ?? false) {
                CacheStore.saveBrowsedCourse(course.code);
                navigationProvider.changePageNumber(1);
              }
            },
          );
        } else {
          return InkWell(
            onTap: null,
            child: Ink(
              child: AvailableCard(
                course: course,
                isAvailable: false,
              ),
            ),
          );
        }
      },
    );
  }
}

class AvailableCard extends StatelessWidget {
  final Course course;
  final bool isAvailable;
  const AvailableCard(
      {super.key, required this.course, required this.isAvailable});

  @override
  Widget build(BuildContext context) {
    Color color = const Color.fromRGBO(99, 99, 99, 1);

    if (isAvailable) {
      if (CacheStore.courseColor[course.code.toLowerCase()] == null) {
        int a = CacheStore.courseColor.length;
        CacheStore.courseColor[course.code.toLowerCase()] =
            colors[a % colors.length];
        color = colors[a % colors.length];
      } else {
        color = CacheStore.courseColor[course.code.toLowerCase()] ?? color;
      }
    }

    return Container(
      color: color,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.all(8.0),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Container(
                  color: Colors.black,
                  child: Padding(
                    padding: const EdgeInsets.all(6.0),
                    child: Text(
                      course.code.toUpperCase(),
                      style: Themes.theme.textTheme.labelSmall,
                    ),
                  ),
                ),
                Visibility(
                  visible: CacheStore.courseAvailability[course.code] == null
                      ? true
                      : !isAvailable,
                  child: Text(
                    'UNAVAILABLE',
                    style: Themes.darkTextTheme.labelSmall,
                  ),
                )
              ],
            ),
          ),
          const Spacer(),
          Padding(
            padding: const EdgeInsets.all(8.0),
            child: Text(
              letterCapitalizer(course.name),
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
              style: Themes.darkTextTheme.displayMedium,
            ),
          ),
        ],
      ),
    );
  }
}
