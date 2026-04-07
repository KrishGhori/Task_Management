import mongoose from 'mongoose'

const profileSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },
    displayName: { type: String, default: '', trim: true },
    phone: { type: String, default: '', trim: true },
    bio: { type: String, default: '', trim: true },
    avatarUrl: { type: String, default: '', trim: true },
  },
  { timestamps: true },
)

export const Profile = mongoose.models.Profile || mongoose.model('Profile', profileSchema)
