import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import '../../constants/themes.dart';
import '../../models/contribution.dart';

class ContributionCard extends StatelessWidget {
  final Contribution contribution;
  const ContributionCard({super.key, required this.contribution});

  @override
  Widget build(BuildContext context) {
    final pathString =
        '${contribution.courseCode.toUpperCase()}  >  ${contribution.year}  >  ${contribution.folder}';

    final newDate = contribution.createdAt.toLocal();

    var formatter = DateFormat("MMMM dd, yyyy");
    String formattedTime = DateFormat('kk:mm:a').format(newDate).toLowerCase();
    String formattedDate = formatter.format(newDate);

    return Container(
      color: Themes.kYellow,
      padding: const EdgeInsets.only(top: 20, right: 20, left: 20, bottom: 10),
      margin: const EdgeInsets.symmetric(vertical: 7),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Text(
                pathString,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(
                    color: Colors.black,
                    fontWeight: FontWeight.bold,
                    fontSize: 14),
              ),
            ],
          ),
          Container(
            padding: const EdgeInsets.symmetric(vertical: 5, horizontal: 0),
            child: Text(
              contribution.description,
              maxLines: 2,
              textAlign: TextAlign.start,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(
                  color: Colors.black,
                  fontWeight: FontWeight.w400,
                  fontSize: 13),
            ),
          ),
          const SizedBox(
            height: 10,
          ),
          // Spacer(),
          Row(
            children: [
              Text(
                formattedDate,
                style: Themes.darkTextTheme.bodySmall,
              ),
              const SizedBox(
                width: 10,
              ),
              Text(
                formattedTime,
                style: Themes.darkTextTheme.bodySmall,
              ),
              const Spacer(),
              Container(
                decoration: const BoxDecoration(
                  color: Colors.black,
                ),
                padding:
                    const EdgeInsets.symmetric(vertical: 10, horizontal: 20),
                child: Text(
                  contribution.approved ? 'APPROVED' : 'PENDING',
                  style: const TextStyle(
                    fontWeight: FontWeight.w700,
                    fontSize: 12,
                  ),
                ),
              ),
            ],
          )
        ],
      ),
    );
  }
}
