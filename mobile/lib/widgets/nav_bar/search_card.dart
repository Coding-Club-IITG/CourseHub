import 'package:flutter/material.dart';
import '../../controllers/letter_capitalizer.dart';

class SearchCard extends StatelessWidget {
  final bool isAvailable;
  final String courseCode;
  final String courseName;
  final Function callback;

  const SearchCard({
    super.key,
    required this.isAvailable,
    required this.courseCode,
    required this.courseName,
    required this.callback,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: () {
        callback();
      },
      child: Container(
        margin: const EdgeInsets.symmetric(vertical: 5),
        padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 18),
        height: 60,
        color: isAvailable ? Colors.black : const Color.fromRGBO(71, 71, 71, 1),
        child: LayoutBuilder(builder: (context, constraints) {
          return Row(
            children: [
              Text(courseCode.toUpperCase()),
              const SizedBox(
                width: 20,
              ),
              SizedBox(
                width: constraints.maxWidth * (0.5),
                child: Text(
                  letterCapitalizer(courseName),
                  style: const TextStyle(fontSize: 12),
                  overflow: TextOverflow.ellipsis,
                ),
              ),
              const Spacer(),
              Visibility(
                visible: !isAvailable,
                child: const Text(
                  'UNAVAILABLE',
                  style: TextStyle(fontSize: 12),
                ),
              )
            ],
          );
        }),
      ),
    );
  }
}
