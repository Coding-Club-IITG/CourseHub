import '../../apis/courses/add_courses.dart';
import '../../database/cache_store.dart';
import '../../utilities/helpers/helpers.dart';
import '../../widgets/common/custom_snackbar.dart';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../providers/navigation_provider.dart';

class SearchCard extends StatefulWidget {
  final bool isAvailable;
  final String courseCode;
  final String courseName;
  final Function? callback;

  final bool isTempCourse;

  const SearchCard({
    super.key,
    required this.isAvailable,
    required this.courseCode,
    required this.courseName,
    required this.isTempCourse,
    required this.callback,
  });

  @override
  State<SearchCard> createState() => _SearchCardState();
}

class _SearchCardState extends State<SearchCard> {
  @override
  Widget build(BuildContext context) {
    final navigationProvider = context.read<NavigationProvider>();

    return Container(
      margin: const EdgeInsets.symmetric(vertical: 5),
      child: Material(
        color: widget.isAvailable
            ? Colors.black
            : const Color.fromRGBO(71, 71, 71, 1),
        child: InkWell(
          splashColor: Colors.grey,
          onTap: widget.isAvailable
              ? () async {
                  if (widget.isTempCourse) {
                    try {
                      await getUserCourses(widget.courseCode,
                          isTempCourse: true);
                      CacheStore.isTempCourse = true;
                      CacheStore.resetBrowsePath();
                      navigationProvider.changePageNumber(1);
                    } catch (e) {
                      if (!context.mounted) return;
                      showSnackBar('Somthing Went Wrong!', context);
                    }
                  } else {
                    widget.callback!();
                  }
                }
              : null,
          child: Container(
            padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 18),
            height: 60,
            child: LayoutBuilder(builder: (context, constraints) {
              return Row(
                children: [
                  Text(widget.courseCode.toUpperCase()),
                  const SizedBox(
                    width: 20,
                  ),
                  SizedBox(
                    width: constraints.maxWidth * (0.5),
                    child: Text(
                      letterCapitalizer(widget.courseName),
                      style: const TextStyle(fontSize: 12),
                    ),
                  ),
                  const Spacer(),
                  Visibility(
                    visible: !widget.isAvailable,
                    child: const Text(
                      'UNAVAILABLE',
                      style: TextStyle(fontSize: 12),
                    ),
                  )
                ],
              );
            }),
          ),
        ),
      ),
    );
  }
}
